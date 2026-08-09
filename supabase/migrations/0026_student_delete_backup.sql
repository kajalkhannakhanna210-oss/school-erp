-- Keep a recoverable snapshot before any student row is deleted.
create table if not exists public.deleted_student_records (
  id uuid primary key default gen_random_uuid(),
  original_student_id uuid not null,
  student_data jsonb not null,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.deleted_student_records enable row level security;

create policy "deleted_student_records_admin_read"
  on public.deleted_student_records for select
  using (public.is_super_admin());

create or replace function public.backup_student_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_student_records (original_student_id, student_data, deleted_by)
  values (old.id, to_jsonb(old), auth.uid());
  return old;
end;
$$;

drop trigger if exists backup_student_before_delete on public.students;
create trigger backup_student_before_delete
before delete on public.students
for each row execute function public.backup_student_before_delete();
