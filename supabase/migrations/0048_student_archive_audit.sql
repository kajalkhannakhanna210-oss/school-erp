-- Migration 0048: Student Archive Audit Trail
-- Tracks when students are archived/restored with remarks and dates

-- Create student archive audit table
create table if not exists public.student_archive_audit (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  action text not null check (action in ('archived', 'restored')),
  archive_date date not null,
  remark text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_student_archive_audit_student_id on public.student_archive_audit(student_id);
create index if not exists idx_student_archive_audit_created_at on public.student_archive_audit(created_at desc);
create index if not exists idx_student_archive_audit_archive_date on public.student_archive_audit(archive_date);

-- Enable RLS
alter table public.student_archive_audit enable row level security;

-- Policies
create policy "student_archive_audit_select" on public.student_archive_audit
  for select using (auth.uid() is not null);

create policy "student_archive_audit_insert_admin" on public.student_archive_audit
  for insert with check (public.is_super_admin());

create policy "student_archive_audit_all_admin" on public.student_archive_audit
  for all using (public.is_super_admin());
