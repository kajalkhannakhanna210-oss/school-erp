-- Migration 0049: Add inactive/archival columns to students

alter table public.students
  add column if not exists inactive_date date,
  add column if not exists inactive_reason text,
  add column if not exists inactive_by uuid references public.profiles(id);

-- Index for queries by inactive_date
create index if not exists idx_students_inactive_date on public.students (inactive_date);
