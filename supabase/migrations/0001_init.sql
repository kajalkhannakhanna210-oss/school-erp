-- Phase 1: Auth, Roles & Academic Structure
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

-- ============================================================
-- Roles & profiles
-- ============================================================

create type public.user_role as enum ('super_admin', 'staff', 'student');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- security-definer helper so RLS policies below don't recursively query profiles
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'super_admin',
    false
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_super_admin());

create policy "profiles_insert_admin_only"
  on public.profiles for insert
  with check (public.is_super_admin());

-- auto-create a profile row whenever a new auth user is created.
-- Phase 2/3 will call supabase.auth.admin.createUser(...) server-side with
-- user_metadata: { full_name, role } to drive this.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Permissions catalog
-- The assignment screen (granting these to specific staff members) arrives
-- in Phase 3 once Staff Management gives us staff records to assign to.
-- ============================================================

create table public.permissions (
  key text primary key,
  label text not null
);

insert into public.permissions (key, label) values
  ('view_students', 'View students'),
  ('mark_attendance', 'Mark attendance'),
  ('view_fee_status', 'View fee status'),
  ('view_reports', 'View reports'),
  ('manage_system_settings', 'Manage system settings');

create table public.staff_permissions (
  staff_id uuid references public.profiles (id) on delete cascade,
  permission_key text references public.permissions (key) on delete cascade,
  primary key (staff_id, permission_key)
);

alter table public.permissions enable row level security;
alter table public.staff_permissions enable row level security;

create policy "permissions_read_all"
  on public.permissions for select
  using (auth.uid() is not null);

create policy "permissions_write_admin"
  on public.permissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "staff_permissions_read_own_or_admin"
  on public.staff_permissions for select
  using (staff_id = auth.uid() or public.is_super_admin());

create policy "staff_permissions_write_admin"
  on public.staff_permissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- Academic structure
-- ============================================================

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table public.class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  session_id uuid not null references public.academic_sessions (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (section_id, session_id)
);

alter table public.academic_sessions enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.class_teachers enable row level security;

-- readable by any signed-in user (students/staff need to see class/section names);
-- writable only by Super Admin
create policy "academic_sessions_read_all" on public.academic_sessions for select using (auth.uid() is not null);
create policy "academic_sessions_write_admin" on public.academic_sessions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "classes_read_all" on public.classes for select using (auth.uid() is not null);
create policy "classes_write_admin" on public.classes for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "sections_read_all" on public.sections for select using (auth.uid() is not null);
create policy "sections_write_admin" on public.sections for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "class_teachers_read_all" on public.class_teachers for select using (auth.uid() is not null);
create policy "class_teachers_write_admin" on public.class_teachers for all
  using (public.is_super_admin()) with check (public.is_super_admin());
