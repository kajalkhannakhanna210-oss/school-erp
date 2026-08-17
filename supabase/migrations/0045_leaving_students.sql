-- Migration 0045: Leaving Students Module
-- Creates leaving student requests, clearances, certificate counters, and audit history.

-- 1. Enum types for Leaving Student Workflow
do $$
begin
  create type public.leaving_request_status as enum (
    'leaving_requested',
    'verification_pending',
    'approved',
    'tc_generated',
    'student_left',
    'rejected',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.leaving_reason as enum (
    'transfer_to_another_school',
    'family_relocation',
    'financial_reasons',
    'completed_studies',
    'health_reasons',
    'personal_reasons',
    'disciplinary_reason',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.clearance_status_enum as enum (
    'cleared',
    'pending',
    'not_applicable'
  );
exception when duplicate_object then null;
end $$;

-- 2. Certificate sequence table for academic-session-based unique numbering
create table if not exists public.leaving_certificate_counters (
  session_id uuid primary key references public.academic_sessions(id) on delete cascade,
  last_counter integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 3. Main Leaving Requests table
create table if not exists public.student_leaving_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id),
  class_id uuid not null references public.classes(id),
  section_id uuid references public.sections(id),
  admission_number text not null,
  student_name text not null,
  father_name text,
  mother_name text,
  admission_date date not null,
  leaving_date date not null,
  reason public.leaving_reason not null,
  other_reason_details text,
  detailed_remarks text,
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  status public.leaving_request_status not null default 'leaving_requested',
  overall_clearance_status text not null default 'pending' check (overall_clearance_status in ('cleared', 'pending')),
  
  -- Certificate Details
  certificate_number text unique,
  certificate_generated_at timestamptz,
  certificate_generated_by uuid references public.profiles(id),
  
  -- Approval Details
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  approval_remarks text,
  rejection_remarks text,
  send_back_remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_leaving_date check (leaving_date >= admission_date)
);

-- Indexes for search and performance
create index if not exists idx_leaving_requests_student_id on public.student_leaving_requests(student_id);
create index if not exists idx_leaving_requests_status on public.student_leaving_requests(status);
create index if not exists idx_leaving_requests_session_id on public.student_leaving_requests(session_id);
create index if not exists idx_leaving_requests_class_id on public.student_leaving_requests(class_id);

-- 4. Departmental Clearances Table
create table if not exists public.student_leaving_clearances (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.student_leaving_requests(id) on delete cascade,
  department text not null check (department in (
    'Accounts', 'Library', 'Transport', 'Hostel', 'Administration', 'Academic Department', 'IT', 'Sports'
  )),
  status public.clearance_status_enum not null default 'pending',
  cleared_by uuid references public.profiles(id),
  cleared_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, department)
);

create index if not exists idx_leaving_clearances_request_id on public.student_leaving_clearances(request_id);

-- 5. Audit Log Table for Leaving Workflow
create table if not exists public.student_leaving_audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.student_leaving_requests(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_status text,
  new_status text,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists idx_leaving_audit_request_id on public.student_leaving_audit_logs(request_id, created_at desc);

-- 6. Helper Function: Certificate Number Generator
create or replace function public.generate_leaving_certificate_number(p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_name text;
  v_counter integer;
  v_year text;
  v_cert_no text;
begin
  select name into v_session_name from public.academic_sessions where id = p_session_id;
  if v_session_name is null then
    v_year := to_char(now(), 'YYYY');
  else
    v_year := regexp_replace(v_session_name, '[^0-9-]', '', 'g');
    if v_year = '' then
      v_year := to_char(now(), 'YYYY');
    end if;
  end if;

  insert into public.leaving_certificate_counters (session_id, last_counter)
  values (p_session_id, 1)
  on conflict (session_id)
  do update set last_counter = public.leaving_certificate_counters.last_counter + 1, updated_at = now()
  returning last_counter into v_counter;

  v_cert_no := 'TC/' || v_year || '/' || lpad(v_counter::text, 4, '0');
  return v_cert_no;
end;
$$;

-- 7. Enable RLS
alter table public.student_leaving_requests enable row level security;
alter table public.student_leaving_clearances enable row level security;
alter table public.student_leaving_audit_logs enable row level security;
alter table public.leaving_certificate_counters enable row level security;

-- 8. Policies
create policy "leaving_requests_select" on public.student_leaving_requests
  for select using (auth.uid() is not null);

create policy "leaving_requests_all_admin" on public.student_leaving_requests
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "leaving_clearances_select" on public.student_leaving_clearances
  for select using (auth.uid() is not null);

create policy "leaving_clearances_all_admin" on public.student_leaving_clearances
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "leaving_audit_select" on public.student_leaving_audit_logs
  for select using (auth.uid() is not null);

create policy "leaving_audit_all_admin" on public.student_leaving_audit_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "leaving_counters_all_admin" on public.leaving_certificate_counters
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- 9. Register leaving_students in role_page_access for super_admin and staff
insert into public.role_page_access (role, page_key, icon)
values
  ('super_admin', 'leaving_students', '🚪'),
  ('staff', 'leaving_students', '🚪')
on conflict (role, page_key) do update
set icon = excluded.icon;
