-- Central system Page Master and tenant-aware page assignments.
create table if not exists public.system_pages (
  id uuid primary key default gen_random_uuid(),
  module_code text not null,
  module_name text not null,
  page_code text not null unique,
  page_name text not null,
  route text not null,
  icon text,
  parent_page_id uuid references public.system_pages(id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_pages (module_code, module_name, page_code, page_name, route, display_order)
values
 ('dashboard','Dashboard','dashboard','Dashboard','/dashboard',10),
 ('students','Students','students','Student Directory','/students',20),
 ('students','Students','add_student','Add Student','/students/new',21),
 ('students','Students','leaving_students','Leaving Students','/leaving-students',22),
 ('admissions','Admissions','enquiries','Admission Enquiry','/enquiries',30),
 ('admissions','Admissions','admissions','Admissions & Alumni','/admissions-admin',31),
 ('attendance','Attendance','attendance','Attendance','/attendance',40),
 ('fees','Fees','fees','Fees','/fees',50),
 ('fees','Fees','payments','Payments','/payments',51),
 ('accounts','Accounts','accounts','Accounts','/accounts',60),
 ('examinations','Examinations','exams','Examinations','/exams',70),
 ('documents','Documents','documents','Documents','/documents',80),
 ('reports','Reports','reports','Reports','/reports',90),
 ('staff','Staff','staff','Staff Members','/staff',100),
 ('staff','Staff','add_staff','Add Staff','/staff/new',101),
 ('staff','Staff','staff_sessions','Staff Sessions','/staff/session-management',102),
 ('master','Master Data','master','Master Data','/master',110),
 ('master','Master Data','sessions','Academic Sessions','/master?tab=sessions',111),
 ('master','Master Data','classes','Classes','/master?tab=classes',112),
 ('master','Master Data','sections','Sections','/master?tab=sections',113),
 ('master','Master Data','class_teachers','Class Teachers','/academic/class-teachers',114),
 ('administration','Administration','organization_master','Organization Master','/organization-master',120),
 ('administration','Administration','school_master','School Master','/school-master',121),
 ('administration','Administration','wing_master','Wing Master','/wings',122),
 ('library','Library','library','Library','/library',130),
 ('transport','Transport','transport','Transport','/transport',140),
 ('hr','HR','hr','Human Resources','/hr',150),
 ('payroll','Payroll','payroll','Payroll','/payroll',160),
 ('settings','Settings','settings','Settings','/settings',170),
 ('security','Security','role_master','Role Master','/role-master',180),
 ('security','Security','role_access','Role Access','/role-access',181),
 ('profile','Profile','profile','My Profile','/profile',190)
on conflict (page_code) do update set page_name = excluded.page_name, route = excluded.route, module_name = excluded.module_name;

create table if not exists public.organisation_page_access (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organizations(id) on delete cascade,
  page_id uuid not null references public.system_pages(id) on delete cascade,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (organisation_id, page_id)
);

create table if not exists public.role_page_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  page_id uuid not null references public.system_pages(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, role_id, page_id)
);

create table if not exists public.staff_page_access (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  page_id uuid not null references public.system_pages(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  changed_by uuid references public.profiles(id) on delete set null,
  unique (organisation_id, school_id, staff_user_id, page_id)
);

create index if not exists organisation_page_access_org_idx on public.organisation_page_access(organisation_id, page_id) where is_enabled;
create index if not exists role_page_assignments_lookup_idx on public.role_page_assignments(organisation_id, role_id, page_id) where is_enabled;
create index if not exists staff_page_access_lookup_idx on public.staff_page_access(organisation_id, staff_user_id, page_id) where is_enabled;

-- Preserve existing behaviour during rollout: existing organisations receive
-- the current system menu, but future assignments are still constrained by
-- this organisation layer.
insert into public.organisation_page_access (organisation_id, page_id, is_enabled)
select o.id, p.id, true from public.organizations o cross join public.system_pages p
on conflict (organisation_id, page_id) do nothing;

alter table public.system_pages enable row level security;
alter table public.organisation_page_access enable row level security;
alter table public.role_page_assignments enable row level security;
alter table public.staff_page_access enable row level security;

drop policy if exists system_pages_read_authenticated on public.system_pages;
create policy system_pages_read_authenticated on public.system_pages for select to authenticated using (is_active);
drop policy if exists organisation_page_access_read on public.organisation_page_access;
create policy organisation_page_access_read on public.organisation_page_access for select to authenticated using (public.has_organisation_access(organisation_id));
drop policy if exists organisation_page_access_manage on public.organisation_page_access;
create policy organisation_page_access_manage on public.organisation_page_access for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists role_page_assignments_read on public.role_page_assignments;
create policy role_page_assignments_read on public.role_page_assignments for select to authenticated using (public.has_organisation_access(organisation_id));
drop policy if exists role_page_assignments_manage on public.role_page_assignments;
create policy role_page_assignments_manage on public.role_page_assignments for all using (public.has_organisation_access(organisation_id) and (public.is_super_admin() or public.has_staff_permission('settings.manage'))) with check (public.has_organisation_access(organisation_id));
drop policy if exists staff_page_access_read on public.staff_page_access;
create policy staff_page_access_read on public.staff_page_access for select to authenticated using (staff_user_id = auth.uid() or public.has_organisation_access(organisation_id));
drop policy if exists staff_page_access_manage on public.staff_page_access;
create policy staff_page_access_manage on public.staff_page_access for all using (public.is_super_admin() or public.has_staff_permission('settings.manage')) with check (public.is_super_admin() or public.has_staff_permission('settings.manage'));

create or replace function public.organisation_has_page(target_organization_id uuid, target_page_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.organisation_page_access a
    where a.organisation_id = target_organization_id and a.page_id = target_page_id and a.is_enabled
  )
$$;

create or replace function public.has_effective_page_access(target_page_code text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1
    from public.profiles u
    join public.system_pages p on p.page_code = target_page_code and p.is_active
    where u.id = auth.uid() and u.is_active and u.organization_id is not null
      and public.organisation_has_page(u.organization_id, p.id)
      and (
        exists (select 1 from public.staff_page_access s where s.staff_user_id = u.id and s.organisation_id = u.organization_id and s.page_id = p.id and s.is_enabled)
        or not exists (select 1 from public.staff_page_access s where s.staff_user_id = u.id and s.organisation_id = u.organization_id)
      )
      and (
        exists (select 1 from public.role_page_assignments r where r.organisation_id = u.organization_id and r.role_id = u.role_id and r.page_id = p.id and r.is_enabled)
        or exists (select 1 from public.role_page_access legacy where legacy.role::text = u.role::text and legacy.page_key = target_page_code)
        or public.has_staff_permission(target_page_code || '.view')
      )
  )
$$;

create or replace function public.get_effective_page_codes()
returns table(page_code text)
language sql security definer stable set search_path = public as $$
  select p.page_code from public.system_pages p where p.is_active and public.has_effective_page_access(p.page_code)
$$;

notify pgrst, 'reload schema';
