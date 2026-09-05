create table if not exists public.system_modules (
  id uuid primary key default gen_random_uuid(),
  module_code text not null unique,
  module_name text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_modules (module_code, module_name, display_order)
select distinct module_code, max(module_name), min(display_order)
from public.system_pages group by module_code
on conflict (module_code) do update set module_name = excluded.module_name;

alter table public.system_pages add column if not exists module_id uuid references public.system_modules(id) on delete cascade;
update public.system_pages p set module_id = m.id from public.system_modules m where p.module_id is null and m.module_code = p.module_code;
create index if not exists system_pages_module_idx on public.system_pages(module_id, display_order);

create table if not exists public.organisation_module_access (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.system_modules(id) on delete cascade,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (organisation_id, module_id)
);

insert into public.organisation_module_access (organisation_id, module_id, is_enabled)
select o.id, m.id, true from public.organizations o cross join public.system_modules m
on conflict (organisation_id, module_id) do nothing;

alter table public.system_modules enable row level security;
alter table public.organisation_module_access enable row level security;
drop policy if exists system_modules_read_authenticated on public.system_modules;
create policy system_modules_read_authenticated on public.system_modules for select to authenticated using (is_active);
drop policy if exists system_modules_manage_super on public.system_modules;
create policy system_modules_manage_super on public.system_modules for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists organisation_module_access_read on public.organisation_module_access;
create policy organisation_module_access_read on public.organisation_module_access for select to authenticated using (public.has_organisation_access(organisation_id));
drop policy if exists organisation_module_access_manage on public.organisation_module_access;
create policy organisation_module_access_manage on public.organisation_module_access for all using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.organisation_has_module(target_organization_id uuid, target_module_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.organisation_module_access a
    where a.organisation_id = target_organization_id and a.module_id = target_module_id and a.is_enabled
  )
$$;

create or replace function public.organisation_has_page(target_organization_id uuid, target_page_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.organisation_page_access a
    join public.system_pages p on p.id = a.page_id and p.is_active
    where a.organisation_id = target_organization_id and a.page_id = target_page_id and a.is_enabled
      and p.module_id is not null and public.organisation_has_module(target_organization_id, p.module_id)
  )
$$;

insert into public.system_pages (module_code, module_name, page_code, page_name, route, display_order, module_id)
select 'security', 'Security', 'module_master', 'Module Master', '/module-master', 179, id
from public.system_modules where module_code = 'security'
on conflict (page_code) do update set module_id = excluded.module_id;
insert into public.role_page_access (role, page_key, icon)
values ('super_admin', 'module_master', '▣') on conflict (role, page_key) do nothing;

notify pgrst, 'reload schema';
