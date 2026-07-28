-- Phase 6: Online Fee Payment
-- Run after 0001-0005.

create type public.payment_status as enum ('created', 'paid', 'failed');

create sequence public.receipt_number_seq;

create or replace function public.generate_receipt_number()
returns text
language sql
as $$
  select 'RCT' || to_char(now(), 'YYYY') || lpad(nextval('public.receipt_number_seq')::text, 5, '0');
$$;

-- Payments are tracked per fee head, not bundled across several in one
-- checkout. A student pays Tuition Fee, then separately pays Sports Fee,
-- rather than one transaction covering both. This is a deliberate scope
-- cut: bundling would need a payment_allocations table splitting one
-- transaction across several fee heads with per-head remaining-balance
-- tracking, which is meaningfully more complex than a first pass needs.
-- Outstanding balance per fee head = the fee's net amount + late fee, minus
-- the sum of this student's 'paid' rows for that fee head.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  fee_head_id uuid not null references public.fee_heads (id),
  session_id uuid not null references public.academic_sessions (id),
  amount numeric(12, 2) not null check (amount > 0),
  status public.payment_status not null default 'created',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  receipt_number text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payments_student_idx on public.payments (student_id);
create index payments_fee_head_idx on public.payments (fee_head_id);

alter table public.payments enable row level security;

create policy "payments_select"
  on public.payments for select
  using (student_id = auth.uid() or public.can_view_student_fees(student_id));

-- A student can start a payment for themselves, but only in the initial
-- 'created' state — they cannot insert a row that's already 'paid'.
create policy "payments_insert_self"
  on public.payments for insert
  with check (student_id = auth.uid() and status = 'created');

-- Deliberately no UPDATE policy for any authenticated role, including
-- Super Admin. The plan is explicit that marking a payment confirmed must
-- only happen through the signature-verified webhook, which uses the
-- service-role client and therefore bypasses RLS entirely — that's the only
-- path to a status change. There's no admin "mark as paid" escape hatch
-- here on purpose; see the README for what that means for manual/offline
-- payment recording, which isn't handled by this phase.

-- One aggregate number for the admin dashboard's "Pending Fees" widget,
-- computed in the database rather than pulling every line item into the app
-- to sum client-side — the latter doesn't scale past a small student body.
-- Clamps each student+fee-head's remainder at zero before summing (mirrors
-- getStudentFeeLines in lib/fees.ts) rather than a flat global subtraction,
-- which could otherwise let an overpayment on one fee head mask a real
-- balance owed elsewhere. Runs as the caller (not security definer), so it
-- still only totals what that caller is allowed to see via
-- student_fee_line_items' own RLS-backed filtering.
create or replace function public.total_outstanding_fees()
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
    greatest(sfl.net_amount + sfl.late_fee - coalesce(paid.amount_paid, 0), 0)
  ), 0)
  from public.student_fee_line_items sfl
  left join (
    select student_id, fee_head_id, sum(amount) as amount_paid
    from public.payments
    where status = 'paid'
    group by student_id, fee_head_id
  ) paid on paid.student_id = sfl.student_id and paid.fee_head_id = sfl.fee_head_id;
$$;
