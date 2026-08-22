-- Migration 0049: Admission Enquiry Management Module
-- Creates enquiries, followups, assignment history, audit logs, counters, and RLS policies.

-- 1. Counters table for unique enquiry numbers (ENQ20260001)
create table if not exists public.enquiry_counters (
  session_id uuid primary key references public.academic_sessions(id) on delete cascade,
  last_counter integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 2. Main Enquiries Table
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_id text unique not null,
  student_name text not null,
  dob date,
  gender text check (gender in ('Male', 'Female', 'Other')),
  class_id uuid references public.classes(id) on delete set null,
  parent_name text not null,
  mobile text not null,
  alternate_mobile text,
  email text,
  address text,
  session_id uuid references public.academic_sessions(id) on delete set null,
  enquiry_type text not null default 'Offline' check (enquiry_type in ('Online', 'Offline')),
  source text not null default 'Walk-in' check (source in ('Walk-in', 'Website', 'Referral', 'Social Media', 'Phone', 'Advertisement', 'Other')),
  remarks text,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  status text not null default 'New' check (status in ('New', 'Assigned', 'Follow-up', 'Interested', 'Won', 'Lost', 'Closed')),
  next_followup_date date,
  last_followup_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enquiries_status on public.enquiries(status);
create index if not exists idx_enquiries_session_id on public.enquiries(session_id);
create index if not exists idx_enquiries_class_id on public.enquiries(class_id);
create index if not exists idx_enquiries_assigned_staff on public.enquiries(assigned_staff_id);
create index if not exists idx_enquiries_next_followup on public.enquiries(next_followup_date);

-- 3. Enquiry Follow-ups Table
create table if not exists public.enquiry_followups (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  followup_type text not null check (followup_type in ('Phone', 'WhatsApp', 'Visit', 'Email', 'Other')),
  notes text not null,
  followup_date date not null default current_date,
  next_followup_date date,
  is_completed boolean not null default true,
  staff_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_followups_enquiry_id on public.enquiry_followups(enquiry_id, created_at desc);

-- 4. Assignment History Table
create table if not exists public.enquiry_assignment_history (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_assignment_enquiry_id on public.enquiry_assignment_history(enquiry_id, created_at desc);

-- 5. Audit Log Table
create table if not exists public.enquiry_audit_logs (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_status text,
  new_status text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_audit_enquiry_id on public.enquiry_audit_logs(enquiry_id, created_at desc);

-- 6. Helper Function: Unique Enquiry ID Generator
create or replace function public.generate_enquiry_id(p_session_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_year text;
  v_counter integer;
  v_enq_id text;
begin
  v_session_id := p_session_id;
  if v_session_id is null then
    select id into v_session_id from public.academic_sessions where is_current = true limit 1;
  end if;

  v_year := to_char(now(), 'YYYY');

  if v_session_id is not null then
    insert into public.enquiry_counters (session_id, last_counter)
    values (v_session_id, 1)
    on conflict (session_id)
    do update set last_counter = public.enquiry_counters.last_counter + 1, updated_at = now()
    returning last_counter into v_counter;
  else
    v_counter := floor(extract(epoch from now()))::integer % 10000;
  end if;

  v_enq_id := 'ENQ' || v_year || lpad(v_counter::text, 4, '0');
  return v_enq_id;
end;
$$;

-- 7. Enable RLS
alter table public.enquiries enable row level security;
alter table public.enquiry_followups enable row level security;
alter table public.enquiry_assignment_history enable row level security;
alter table public.enquiry_audit_logs enable row level security;
alter table public.enquiry_counters enable row level security;

-- 8. RLS Policies
create policy "enquiries_select" on public.enquiries for select using (auth.uid() is not null);
create policy "enquiries_all_super_admin" on public.enquiries for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "enquiries_insert_staff" on public.enquiries for insert with check (auth.uid() is not null);
create policy "enquiries_update_staff" on public.enquiries for update using (auth.uid() is not null);

create policy "enquiry_followups_select" on public.enquiry_followups for select using (auth.uid() is not null);
create policy "enquiry_followups_all_staff" on public.enquiry_followups for all using (auth.uid() is not null);

create policy "enquiry_assignment_select" on public.enquiry_assignment_history for select using (auth.uid() is not null);
create policy "enquiry_assignment_all_staff" on public.enquiry_assignment_history for all using (auth.uid() is not null);

create policy "enquiry_audit_select" on public.enquiry_audit_logs for select using (auth.uid() is not null);
create policy "enquiry_audit_all_staff" on public.enquiry_audit_logs for all using (auth.uid() is not null);

create policy "enquiry_counters_all" on public.enquiry_counters for all using (auth.uid() is not null);

-- 9. Register enquiries in role_page_access
insert into public.role_page_access (role, page_key, icon)
values
  ('super_admin', 'enquiries', '📑'),
  ('staff', 'enquiries', '📑')
on conflict (role, page_key) do update set icon = excluded.icon;
