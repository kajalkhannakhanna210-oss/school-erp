-- Phase 2: Student Management
-- Run after 0001_init.sql.

-- ============================================================
-- Admission numbers
-- ============================================================

create sequence public.admission_number_seq;

create or replace function public.generate_admission_number()
returns text
language sql
as $$
  select 'ADM' || to_char(now(), 'YYYY') || lpad(nextval('public.admission_number_seq')::text, 4, '0');
$$;

-- ============================================================
-- Students
-- One row per student, keyed to the same id as their profiles/auth.users row.
-- Note: we deliberately do NOT include a government-ID (e.g. Aadhaar) field.
-- Most schools don't need one in the system at all; if yours genuinely does,
-- add it as its own column, restrict it to Super-Admin-only SELECT in the
-- policy below, and store it encrypted rather than as plain text.
-- ============================================================

create table public.students (
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

create index students_class_section_session_idx on public.students (class_id, section_id, session_id);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

-- Shared visibility rule, reused by the students table, student_documents,
-- and the storage policies below — keeps the "who can see this student" logic
-- defined in exactly one place.
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
      where ct.staff_id = auth.uid()
        and ct.class_id = target_class
        and ct.section_id = target_section
    );
$$;

alter table public.students enable row level security;
alter table public.student_documents enable row level security;

create policy "students_select"
  on public.students for select
  using (public.can_view_student(id, class_id, section_id));

-- Writes stay Super-Admin-only in this phase. Records are archived via
-- UPDATE (is_active = false), never hard-deleted, so fee/attendance history
-- from later phases never orphans.
create policy "students_insert_admin" on public.students for insert with check (public.is_super_admin());
create policy "students_update_admin" on public.students for update using (public.is_super_admin());

create policy "student_documents_select"
  on public.student_documents for select
  using (
    exists (
      select 1 from public.students s
      where s.id = student_documents.student_id
        and public.can_view_student(s.id, s.class_id, s.section_id)
    )
  );

create policy "student_documents_write_admin"
  on public.student_documents for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- Storage: student photos & documents
-- Both buckets are private — files are served via short-lived signed URLs,
-- never public links, since these are records about minors.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do nothing;

-- Files are stored under "{student_id}/filename", so the first path segment
-- tells us which student a given object belongs to.
create policy "student_photos_read"
  on storage.objects for select
  using (
    bucket_id = 'student-photos'
    and exists (
      select 1 from public.students s
      where s.id::text = (storage.foldername(name))[1]
        and public.can_view_student(s.id, s.class_id, s.section_id)
    )
  );

create policy "student_photos_write_admin"
  on storage.objects for all
  using (bucket_id = 'student-photos' and public.is_super_admin())
  with check (bucket_id = 'student-photos' and public.is_super_admin());

create policy "student_documents_bucket_read"
  on storage.objects for select
  using (
    bucket_id = 'student-documents'
    and exists (
      select 1 from public.students s
      where s.id::text = (storage.foldername(name))[1]
        and public.can_view_student(s.id, s.class_id, s.section_id)
    )
  );

create policy "student_documents_bucket_write_admin"
  on storage.objects for all
  using (bucket_id = 'student-documents' and public.is_super_admin())
  with check (bucket_id = 'student-documents' and public.is_super_admin());
