-- Repair a remote project where migration 0002 was recorded but its student
-- tables were not present in the exposed schema.
create sequence if not exists public.admission_number_seq;

create or replace function public.generate_admission_number()
returns text
language sql
as $$
  select 'ADM' || to_char(now(), 'YYYY') || lpad(nextval('public.admission_number_seq')::text, 4, '0');
$$;

create table if not exists public.students (
  id uuid primary key references public.profiles (id) on delete cascade,
  admission_number text not null unique default public.generate_admission_number(),
  roll_number text,
  father_name text,
  mother_name text,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  blood_group text,
  address text,
  mobile_number text,
  contact_email text,
  class_id uuid references public.classes (id),
  section_id uuid references public.sections (id),
  session_id uuid references public.academic_sessions (id),
  admission_date date not null default current_date,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists students_class_section_session_idx on public.students (class_id, section_id, session_id);

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create or replace function public.can_view_student(target_id uuid, target_class uuid, target_section uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    target_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.staff_permissions sp
      where sp.staff_id = auth.uid() and sp.permission_key = 'view_students'
    )
    or exists (
      select 1 from public.class_teachers ct
      where ct.staff_id = auth.uid() and ct.class_id = target_class and ct.section_id = target_section
    );
$$;

alter table public.students enable row level security;
alter table public.student_documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'students' and policyname = 'students_select') then
    create policy "students_select" on public.students for select using (public.can_view_student(id, class_id, section_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'students' and policyname = 'students_insert_admin') then
    create policy "students_insert_admin" on public.students for insert with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'students' and policyname = 'students_update_admin') then
    create policy "students_update_admin" on public.students for update using (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_documents' and policyname = 'student_documents_select') then
    create policy "student_documents_select" on public.student_documents for select using (
      exists (select 1 from public.students s where s.id = student_documents.student_id and public.can_view_student(s.id, s.class_id, s.section_id))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_documents' and policyname = 'student_documents_write_admin') then
    create policy "student_documents_write_admin" on public.student_documents for all using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
