create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

alter table public.student_enrollments enable row level security;
create policy "student_enrollments_read_authenticated" on public.student_enrollments for select using (auth.uid() is not null);
create policy "student_enrollments_write_admin" on public.student_enrollments for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.student_enrollments (student_id, session_id, class_id, section_id)
select id, session_id, class_id, section_id from public.students
where session_id is not null and class_id is not null and section_id is not null
on conflict (student_id, session_id) do nothing;
