-- Phase 7: Exams & Results
-- Not in the original spec — added because the student portal promised
-- "view exam results" with no admin-side module to produce them.
-- Run after 0001-0006.

-- ============================================================
-- Subjects — defined per class, since different classes have different
-- subject lists.
-- ============================================================

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

alter table public.subjects enable row level security;
create policy "subjects_read_all" on public.subjects for select using (auth.uid() is not null);
create policy "subjects_write_admin" on public.subjects for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Exams — scoped to a session. One exam (e.g. "Mid-Term 2026") spans every
-- class; which subjects it covers per class, and their max/pass marks, is
-- exam_subjects below.
-- ============================================================

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_sessions (id),
  name text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;
create policy "exams_read_all" on public.exams for select using (auth.uid() is not null);
create policy "exams_write_admin" on public.exams for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create table public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  subject_id uuid not null references public.subjects (id),
  max_marks numeric(6, 2) not null check (max_marks > 0),
  pass_marks numeric(6, 2) not null check (pass_marks >= 0),
  created_at timestamptz not null default now(),
  unique (exam_id, subject_id),
  constraint exam_subjects_pass_within_max check (pass_marks <= max_marks)
);

alter table public.exam_subjects enable row level security;
create policy "exam_subjects_read_all" on public.exam_subjects for select using (auth.uid() is not null);
create policy "exam_subjects_write_admin" on public.exam_subjects for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Marks — who can enter them mirrors Attendance's pattern: the assigned
-- class teacher (for their specific class + section) or a Super Admin.
-- Unlike attendance, there's no separate "broad permission" here — the
-- Phase 1 catalog has nothing that maps to exam marks, and the plan didn't
-- ask for one, so this stays narrower than attendance on purpose.
-- ============================================================

create or replace function public.can_manage_exam_marks(target_class uuid, target_section uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.class_teachers ct
      where ct.staff_id = auth.uid() and ct.class_id = target_class and ct.section_id = target_section
    );
$$;

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  exam_subject_id uuid not null references public.exam_subjects (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  marks_obtained numeric(6, 2) not null check (marks_obtained >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_subject_id, student_id)
);

-- A CHECK constraint can't reference another table's column, and
-- marks_obtained needs to stay within that subject's configured max_marks —
-- hence a trigger rather than a plain constraint.
create or replace function public.validate_marks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_m numeric;
begin
  select max_marks into max_m from public.exam_subjects where id = new.exam_subject_id;
  if max_m is null then
    raise exception 'Unknown exam subject';
  end if;
  if new.marks_obtained > max_m then
    raise exception 'Marks obtained (%) cannot exceed max marks (%) for this subject', new.marks_obtained, max_m;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger marks_validate
  before insert or update on public.marks
  for each row execute function public.validate_marks();

alter table public.marks enable row level security;

create policy "marks_select"
  on public.marks for select
  using (
    exists (
      select 1 from public.students s
      join public.exam_subjects es on es.id = marks.exam_subject_id
      join public.exams e on e.id = es.exam_id
      where s.id = marks.student_id
        and (
          (s.id = auth.uid() and e.is_published = true)
          or public.can_manage_exam_marks(s.class_id, s.section_id)
        )
    )
  );

-- Staff can enter/edit marks only while the exam is unpublished — publishing
-- is the "this is final" signal, matching the lock semantics from
-- Attendance. Super Admin can still edit after publishing (and un-publish
-- if a genuine correction is needed).
create policy "marks_write"
  on public.marks for all
  using (
    exists (
      select 1 from public.students s
      join public.exam_subjects es on es.id = marks.exam_subject_id
      join public.exams e on e.id = es.exam_id
      where s.id = marks.student_id
        and public.can_manage_exam_marks(s.class_id, s.section_id)
        and (public.is_super_admin() or e.is_published = false)
    )
  )
  with check (
    exists (
      select 1 from public.students s
      join public.exam_subjects es on es.id = marks.exam_subject_id
      join public.exams e on e.id = es.exam_id
      where s.id = marks.student_id
        and public.can_manage_exam_marks(s.class_id, s.section_id)
        and (public.is_super_admin() or e.is_published = false)
    )
  );

-- ============================================================
-- Grade computation & the aggregate results view — the "compute
-- grade/percentage automatically" requirement, done once here rather than
-- per-screen. security_invoker means this view only ever returns marks the
-- querying user could already see directly via marks_select — a student
-- gets nothing back for an unpublished exam, since the underlying join
-- returns no rows for them in that case.
-- ============================================================

create or replace function public.compute_grade(percentage numeric)
returns text
language sql
immutable
as $$
  select case
    when percentage is null then null
    when percentage >= 90 then 'A+'
    when percentage >= 80 then 'A'
    when percentage >= 70 then 'B'
    when percentage >= 60 then 'C'
    when percentage >= 50 then 'D'
    when percentage >= 33 then 'E'
    else 'F'
  end;
$$;

create view public.exam_results
with (security_invoker = true)
as
select
  m.student_id,
  es.exam_id,
  e.name as exam_name,
  e.is_published,
  sum(m.marks_obtained) as total_obtained,
  sum(es.max_marks) as total_max,
  round(sum(m.marks_obtained) / nullif(sum(es.max_marks), 0) * 100, 2) as percentage,
  public.compute_grade(round(sum(m.marks_obtained) / nullif(sum(es.max_marks), 0) * 100, 2)) as grade,
  bool_and(m.marks_obtained >= es.pass_marks) as passed_all_subjects
from public.marks m
join public.exam_subjects es on es.id = m.exam_subject_id
join public.exams e on e.id = es.exam_id
group by m.student_id, es.exam_id, e.name, e.is_published;
