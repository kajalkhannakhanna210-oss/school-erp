-- Phase 3: Staff Management
-- Run after 0001_init.sql and 0002_students.sql.

-- ============================================================
-- Employee IDs
-- ============================================================

create sequence public.employee_id_seq;

create or replace function public.generate_employee_id()
returns text
language sql
as $$
  select 'EMP' || to_char(now(), 'YYYY') || lpad(nextval('public.employee_id_seq')::text, 4, '0');
$$;

-- ============================================================
-- Staff
-- One row per staff member, keyed to the same id as their profiles/auth.users row.
-- ============================================================

create table public.staff (
  id uuid primary key references public.profiles (id) on delete cascade,
  employee_id text not null unique default public.generate_employee_id(),
  department text,
  designation text,
  qualification text,
  mobile_number text,
  contact_email text,
  salary numeric(12, 2),
  joining_date date not null default current_date,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The written spec only called out salary + employee ID as admin-only, but on
-- reflection department, designation, joining date, and active status belong
-- to HR/admin too, not self-reported — a staff member shouldn't be able to
-- promote their own designation or reactivate themselves after being
-- archived. Contact fields (mobile, email, qualification, photo) stay
-- self-editable. There's no UI wired up for staff self-editing yet, but the
-- policy + trigger below make it safe to add later without revisiting RLS.
create or replace function public.protect_staff_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    new.employee_id := old.employee_id;
    new.salary := old.salary;
    new.department := old.department;
    new.designation := old.designation;
    new.joining_date := old.joining_date;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger staff_protect_admin_columns
  before update on public.staff
  for each row execute function public.protect_staff_admin_columns();

alter table public.staff enable row level security;

-- No staff-to-staff visibility, and no "view_staff" style permission like
-- students have — Staff Management is a Super-Admin-only module. A staff
-- member only ever sees their own row (e.g. on their profile page).
create policy "staff_select" on public.staff for select
  using (id = auth.uid() or public.is_super_admin());

create policy "staff_insert_admin" on public.staff for insert with check (public.is_super_admin());

-- Both self and admin can attempt an update; the trigger above decides which
-- columns actually change depending on who's doing it. Salary stays visible
-- only to the row owner and Super Admin, same as every other column here —
-- there's no broader staff list that could leak it, since the module itself
-- is admin-only.
create policy "staff_update_self_or_admin" on public.staff for update
  using (id = auth.uid() or public.is_super_admin());

-- ============================================================
-- Storage: staff photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', false)
on conflict (id) do nothing;

create policy "staff_photos_read"
  on storage.objects for select
  using (
    bucket_id = 'staff-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_super_admin())
  );

create policy "staff_photos_write_self_or_admin"
  on storage.objects for all
  using (
    bucket_id = 'staff-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_super_admin())
  )
  with check (
    bucket_id = 'staff-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_super_admin())
  );
