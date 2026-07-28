-- Phase 5: Fee Structure Setup
-- Admin-side configuration only — no payment collection yet, that's Phase 6.
-- Run after 0001-0004.

create type public.fee_frequency as enum ('one_time', 'monthly');
create type public.late_fee_rule_type as enum ('none', 'per_day', 'fixed', 'percentage');
create type public.concession_type as enum ('percentage', 'fixed');

-- ============================================================
-- Fee heads
-- ============================================================

create table public.fee_heads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.fee_heads enable row level security;
create policy "fee_heads_read_all" on public.fee_heads for select using (auth.uid() is not null);
create policy "fee_heads_write_admin" on public.fee_heads for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Class-wise fee structure
-- One row = "this fee head costs this much, on this schedule, for this
-- class in this session." A class's full structure is just every row
-- matching its class_id + session_id — there's no separate "assignment"
-- step; a student is automatically subject to their class's structure by
-- virtue of the class_id/session_id already on their students row.
-- ============================================================

create table public.fee_structure_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_sessions (id),
  class_id uuid not null references public.classes (id),
  fee_head_id uuid not null references public.fee_heads (id),
  amount numeric(12, 2) not null check (amount >= 0),
  frequency public.fee_frequency not null,
  -- Exactly one of these is set, matching `frequency`.
  due_day_of_month int check (due_day_of_month between 1 and 28),
  due_date date,
  created_at timestamptz not null default now(),
  unique (session_id, class_id, fee_head_id),
  constraint fee_structure_items_due_matches_frequency check (
    (frequency = 'monthly' and due_day_of_month is not null and due_date is null)
    or (frequency = 'one_time' and due_date is not null and due_day_of_month is null)
  )
);

alter table public.fee_structure_items enable row level security;
create policy "fee_structure_items_read_all" on public.fee_structure_items for select using (auth.uid() is not null);
create policy "fee_structure_items_write_admin" on public.fee_structure_items for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Late fee rules — one optional global default per session (class_id null)
-- and optional per-class overrides. The partial unique indexes enforce "at
-- most one global rule per session" and "at most one rule per class per
-- session" separately, since a plain unique constraint treats every NULL as
-- distinct and wouldn't actually stop duplicate global rows.
-- ============================================================

create table public.late_fee_rules (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_sessions (id),
  class_id uuid references public.classes (id),
  rule_type public.late_fee_rule_type not null default 'none',
  value numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index late_fee_rules_global_uidx on public.late_fee_rules (session_id) where class_id is null;
create unique index late_fee_rules_class_uidx on public.late_fee_rules (session_id, class_id) where class_id is not null;

alter table public.late_fee_rules enable row level security;
create policy "late_fee_rules_read_all" on public.late_fee_rules for select using (auth.uid() is not null);
create policy "late_fee_rules_write_admin" on public.late_fee_rules for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Student concessions — per student, per fee head
-- ============================================================

create table public.student_concessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  fee_head_id uuid not null references public.fee_heads (id) on delete cascade,
  concession_type public.concession_type not null,
  value numeric(12, 2) not null check (value >= 0),
  created_at timestamptz not null default now(),
  unique (student_id, fee_head_id)
);

-- Deliberately narrower than can_view_student(): the written plan gates fee
-- visibility on the view_fee_status permission specifically, with no
-- class-teacher exception the way student bio-data has one. A class teacher
-- can see their student's profile without automatically seeing their fees.
create or replace function public.can_view_student_fees(target_student uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    target_student = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.staff_permissions sp
      where sp.staff_id = auth.uid() and sp.permission_key = 'view_fee_status'
    );
$$;

alter table public.student_concessions enable row level security;

create policy "student_concessions_select" on public.student_concessions for select
  using (public.can_view_student_fees(student_id));

create policy "student_concessions_write_admin" on public.student_concessions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Due date & late fee calculation — a stored, reusable calculation rather
-- than something recomputed inconsistently across the UI. Phase 6
-- (payments) and Phase 8 (reports) both reuse this rather than re-deriving
-- the logic.
-- ============================================================

create or replace function public.compute_due_date(item public.fee_structure_items, as_of date default current_date)
returns date
language plpgsql
stable
as $$
begin
  if item.frequency = 'one_time' then
    return item.due_date;
  end if;

  -- Monthly: the most recent occurrence of due_day_of_month on or before as_of.
  if extract(day from as_of) >= item.due_day_of_month then
    return make_date(extract(year from as_of)::int, extract(month from as_of)::int, item.due_day_of_month);
  else
    return (make_date(extract(year from as_of)::int, extract(month from as_of)::int, item.due_day_of_month) - interval '1 month')::date;
  end if;
end;
$$;

create or replace function public.compute_late_fee(item_id uuid, as_of date default current_date)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  item public.fee_structure_items;
  rule public.late_fee_rules;
  due date;
  days_late int;
begin
  select * into item from public.fee_structure_items where id = item_id;
  if item is null then return 0; end if;

  due := public.compute_due_date(item, as_of);
  if due is null or as_of <= due then return 0; end if;
  days_late := as_of - due;

  -- Prefer a class-specific rule over the session's global default; the
  -- NULLS LAST trick picks the class-specific row first when both exist.
  select * into rule from public.late_fee_rules
  where session_id = item.session_id and (class_id = item.class_id or class_id is null)
  order by class_id nulls last
  limit 1;

  if rule is null or rule.rule_type = 'none' then
    return 0;
  elsif rule.rule_type = 'per_day' then
    return rule.value * days_late;
  elsif rule.rule_type = 'fixed' then
    return rule.value;
  elsif rule.rule_type = 'percentage' then
    return round(item.amount * (rule.value / 100.0), 2);
  else
    return 0;
  end if;
end;
$$;

-- ============================================================
-- The one place gross/concession/net/late-fee/total is computed. Everywhere
-- in the app that shows a student's fees should read from this view rather
-- than recomputing the arithmetic locally.
-- security_invoker is required here: without it, a view runs with its
-- owner's privileges (which on Supabase bypasses RLS entirely) rather than
-- the querying user's — a common and easy-to-miss gotcha.
-- ============================================================

create view public.student_fee_line_items
with (security_invoker = true)
as
select
  s.id as student_id,
  s.class_id,
  s.section_id,
  s.session_id,
  fh.id as fee_head_id,
  fh.name as fee_head_name,
  fsi.id as fee_structure_item_id,
  fsi.amount as gross_amount,
  fsi.frequency,
  public.compute_due_date(fsi, current_date) as current_due_date,
  sc.concession_type,
  coalesce(sc.value, 0) as concession_value,
  case
    when sc.concession_type = 'percentage' then round(fsi.amount * (1 - sc.value / 100.0), 2)
    when sc.concession_type = 'fixed' then greatest(fsi.amount - sc.value, 0)
    else fsi.amount
  end as net_amount,
  public.compute_late_fee(fsi.id, current_date) as late_fee
from public.students s
join public.fee_structure_items fsi on fsi.class_id = s.class_id and fsi.session_id = s.session_id
join public.fee_heads fh on fh.id = fsi.fee_head_id and fh.is_active = true
left join public.student_concessions sc on sc.student_id = s.id and sc.fee_head_id = fh.id
where s.is_active = true
  and public.can_view_student_fees(s.id);
