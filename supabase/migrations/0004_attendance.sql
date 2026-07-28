-- Phase 4: Attendance
-- Run after 0001-0003.

create type public.attendance_status as enum ('present', 'absent', 'late', 'leave');

-- ============================================================
-- A "batch" is one class + section + date's worth of attendance, marked in
-- one bulk submission. Locking is a property of the batch, not individual
-- records, since the whole day is submitted (and re-locked) together.
-- ============================================================

create table public.attendance_batches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  section_id uuid not null references public.sections (id),
  session_id uuid not null references public.academic_sessions (id),
  attendance_date date not null check (attendance_date <= current_date),
  is_locked boolean not null default false,
  marked_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (class_id, section_id, attendance_date)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.attendance_batches (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  -- Denormalized from the parent batch (a batch's date never changes once
  -- created, so this can't drift) — makes a student's own attendance history
  -- a single-table query instead of a join, and keeps future reporting simple.
  attendance_date date not null,
  status public.attendance_status not null,
  unique (batch_id, student_id)
);

create index attendance_records_student_date_idx on public.attendance_records (student_id, attendance_date);

-- Who's allowed to mark/view attendance for a given class+section: the
-- assigned class teacher, anyone holding the broader `mark_attendance`
-- permission, or a Super Admin.
create or replace function public.can_manage_attendance(target_class uuid, target_section uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.staff_permissions sp
      where sp.staff_id = auth.uid() and sp.permission_key = 'mark_attendance'
    )
    or exists (
      select 1 from public.class_teachers ct
      where ct.staff_id = auth.uid() and ct.class_id = target_class and ct.section_id = target_section
    );
$$;

-- Staff can lock their own submission (that's what "submit" means) but only
-- a Super Admin can unlock one for editing — the override path from the plan.
create or replace function public.protect_attendance_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_locked = true and new.is_locked = false and not public.is_super_admin() then
    raise exception 'Only a Super Admin can unlock attendance for editing';
  end if;
  return new;
end;
$$;

create trigger attendance_batches_protect_unlock
  before update on public.attendance_batches
  for each row execute function public.protect_attendance_unlock();

alter table public.attendance_batches enable row level security;
alter table public.attendance_records enable row level security;

create policy "attendance_batches_select"
  on public.attendance_batches for select
  using (public.can_manage_attendance(class_id, section_id));

create policy "attendance_batches_insert"
  on public.attendance_batches for insert
  with check (public.can_manage_attendance(class_id, section_id) and attendance_date <= current_date);

-- RLS just gates who can touch the row; the trigger above is what actually
-- enforces the one-way "staff can lock, only admin can unlock" rule.
create policy "attendance_batches_update"
  on public.attendance_batches for update
  using (public.can_manage_attendance(class_id, section_id));

create policy "attendance_records_select_manager"
  on public.attendance_records for select
  using (
    exists (
      select 1 from public.attendance_batches b
      where b.id = attendance_records.batch_id
        and public.can_manage_attendance(b.class_id, b.section_id)
    )
  );

create policy "attendance_records_select_self"
  on public.attendance_records for select
  using (student_id = auth.uid());

-- Writes additionally require the parent batch to be unlocked — this is the
-- "editing a locked date requires the override first" rule.
create policy "attendance_records_write"
  on public.attendance_records for all
  using (
    exists (
      select 1 from public.attendance_batches b
      where b.id = attendance_records.batch_id
        and public.can_manage_attendance(b.class_id, b.section_id)
        and b.is_locked = false
    )
  )
  with check (
    exists (
      select 1 from public.attendance_batches b
      where b.id = attendance_records.batch_id
        and public.can_manage_attendance(b.class_id, b.section_id)
        and b.is_locked = false
    )
  );

-- ============================================================
-- Activity log — a minimal foundation, just enough to record the unlock
-- override this phase requires. The fuller admin-facing log viewer with
-- broader event coverage is Phase 10's job; this table is built so Phase 10
-- extends it rather than replacing it.
-- ============================================================

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "activity_logs_select_admin" on public.activity_logs for select using (public.is_super_admin());
create policy "activity_logs_insert_self" on public.activity_logs for insert with check (actor_id = auth.uid());
