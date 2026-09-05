-- Configurable staff roles, role permissions, and tenant-aware authorization.
-- Legacy profiles.role, permissions, staff_permissions, and role_page_access
-- remain supported so existing accounts continue to work during migration.

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  role_code text not null,
  role_name text not null,
  role_scope text not null default 'SCHOOL',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_scope in ('ORGANISATION', 'SCHOOL'))
);
create unique index if not exists staff_roles_global_code_uq
  on public.staff_roles(lower(role_code)) where organization_id is null;
create unique index if not exists staff_roles_org_code_uq
  on public.staff_roles(organization_id, lower(role_code)) where organization_id is not null;

alter table public.profiles add column if not exists role_id uuid references public.staff_roles(id) on delete set null;
alter table public.staff add column if not exists role_id uuid references public.staff_roles(id) on delete set null;
create index if not exists profiles_staff_role_idx on public.profiles(role_id);
create index if not exists staff_role_idx on public.staff(role_id);

create table if not exists public.role_permissions (
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

insert into public.permissions (key, label) values
  ('dashboard.view', 'View dashboard'),
  ('school.view', 'View schools'), ('school.create', 'Create schools'), ('school.edit', 'Edit schools'),
  ('staff.view', 'View staff'), ('staff.create', 'Create staff'), ('staff.edit', 'Edit staff'), ('staff.delete', 'Delete staff'),
  ('student.view', 'View students'), ('student.create', 'Create students'), ('student.edit', 'Edit students'),
  ('admission.view', 'View admissions'), ('admission.create', 'Create admissions'),
  ('attendance.view', 'View attendance'), ('attendance.manage', 'Manage attendance'),
  ('fees.view', 'View fees'), ('fees.collect', 'Collect fees'),
  ('accounts.view', 'View accounts'), ('accounts.manage', 'Manage accounts'),
  ('exam.view', 'View examinations'), ('exam.manage', 'Manage examinations'),
  ('library.view', 'View library'), ('library.manage', 'Manage library'),
  ('transport.view', 'View transport'), ('transport.manage', 'Manage transport'),
  ('reports.view', 'View reports'), ('settings.view', 'View settings'), ('settings.manage', 'Manage settings')
on conflict (key) do nothing;

-- Existing navigation access becomes permission-backed as well. This keeps
-- current role-page configuration working while allowing new roles to use the
-- same permission catalog.
insert into public.permissions (key, label)
select distinct rpa.page_key || '.view', 'View ' || replace(rpa.page_key, '_', ' ')
from public.role_page_access rpa
on conflict (key) do nothing;

insert into public.staff_roles (role_code, role_name, role_scope, description)
values
  ('ORGANISATION_ADMIN', 'Organisation Admin', 'ORGANISATION', 'Full organisation administration'),
  ('HR_MANAGER', 'HR Manager', 'ORGANISATION', 'Human resources across permitted schools'),
  ('FINANCE_MANAGER', 'Finance Manager', 'ORGANISATION', 'Organisation finance management'),
  ('PRINCIPAL', 'Principal', 'SCHOOL', 'School administration'),
  ('TEACHER', 'Teacher', 'SCHOOL', 'Teaching and attendance'),
  ('ACCOUNTANT', 'Accountant', 'SCHOOL', 'School accounts and fees'),
  ('LIBRARIAN', 'Librarian', 'SCHOOL', 'Library management'),
  ('STAFF', 'Staff', 'SCHOOL', 'General staff access')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, rpa.page_key || '.view'
from public.staff_roles r
join public.role_page_access rpa
  on lower(r.role_code) = lower(rpa.role::text)
on conflict do nothing;

-- Link existing explicit organisation/school administrator records where the
-- legacy role already expresses the same meaning. Other staff can be assigned
-- a configurable role from the staff administration UI later.
update public.profiles p set role_id = r.id
from public.staff_roles r
where p.role_id is null
  and ((p.role = 'organization_admin' and r.role_code = 'ORGANISATION_ADMIN')
    or (p.role = 'school_admin' and r.role_code = 'PRINCIPAL')
    or (p.role = 'staff' and r.role_code = 'STAFF'));
update public.staff s set role_id = p.role_id
from public.profiles p where s.id = p.id and s.role_id is null and p.role_id is not null;

-- Make role permissions additive over the existing per-user permission rows.
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values
  ('dashboard.view'), ('student.view'), ('admission.view'), ('attendance.view'), ('exam.view'), ('reports.view')
) x(permission_key)
where r.role_code = 'STAFF'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values
  ('dashboard.view'), ('school.view'), ('school.create'), ('school.edit'), ('staff.view'), ('staff.create'), ('staff.edit'), ('staff.delete'),
  ('student.view'), ('student.create'), ('student.edit'), ('admission.view'), ('admission.create'), ('attendance.view'), ('attendance.manage'),
  ('fees.view'), ('fees.collect'), ('accounts.view'), ('accounts.manage'), ('exam.view'), ('exam.manage'), ('reports.view'), ('settings.view'), ('settings.manage')
) x(permission_key)
where r.role_code = 'ORGANISATION_ADMIN'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('dashboard.view'), ('attendance.view'), ('attendance.manage'), ('exam.view'), ('reports.view')) x(permission_key)
where r.role_code = 'PRINCIPAL'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('dashboard.view'), ('fees.view'), ('fees.collect'), ('accounts.view')) x(permission_key)
where r.role_code = 'ACCOUNTANT'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('dashboard.view'), ('library.view'), ('library.manage')) x(permission_key)
where r.role_code = 'LIBRARIAN'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('dashboard.view'), ('staff.view'), ('staff.create'), ('staff.edit'), ('reports.view')) x(permission_key)
where r.role_code = 'HR_MANAGER'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('dashboard.view'), ('fees.view'), ('fees.collect'), ('accounts.view'), ('accounts.manage'), ('reports.view')) x(permission_key)
where r.role_code = 'FINANCE_MANAGER'
on conflict do nothing;

alter table public.staff_roles enable row level security;
alter table public.role_permissions enable row level security;
drop policy if exists staff_roles_read_authenticated on public.staff_roles;
create policy staff_roles_read_authenticated on public.staff_roles for select to authenticated using (is_active and (organization_id is null or public.has_organisation_access(organization_id)));
drop policy if exists staff_roles_manage_super on public.staff_roles;
create policy staff_roles_manage_super on public.staff_roles for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists role_permissions_read_authenticated on public.role_permissions;
create policy role_permissions_read_authenticated on public.role_permissions for select to authenticated using (exists (select 1 from public.staff_roles r where r.id = role_id and (r.organization_id is null or public.has_organisation_access(r.organization_id))));
drop policy if exists role_permissions_manage_super on public.role_permissions;
create policy role_permissions_manage_super on public.role_permissions for all using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.has_staff_permission(permission_key text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.staff_roles r on r.id = rp.role_id and r.is_active
    where p.id = auth.uid() and p.is_active and rp.permission_key = has_staff_permission.permission_key
  ) or exists (
    select 1 from public.staff_permissions sp
    where sp.staff_id = auth.uid() and sp.permission_key = has_staff_permission.permission_key
  )
$$;

create or replace function public.has_school_access(target_organization_id uuid, target_school_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.current_user_type() = 'SUPER_ADMIN' or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
      and p.organization_id = target_organization_id and p.school_id = target_school_id
  ) or exists (
    select 1 from public.organization_memberships m where m.profile_id = auth.uid()
      and m.organization_id = target_organization_id and m.school_id = target_school_id and m.is_active
  ) or exists (
    select 1 from public.organization_memberships m where m.profile_id = auth.uid()
      and m.organization_id = target_organization_id and m.school_id is null and m.is_active
  ) or (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = target_organization_id and p.user_type = 'ORGANISATION_USER' and p.is_active)
    and (
      not exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL')
      or exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL' and (s.scope_type = 'ALL' or s.resource_id = target_school_id))
    )
  )
$$;

notify pgrst, 'reload schema';
