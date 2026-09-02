-- Phase 1: multi-organization, multi-school public website foundation.
-- This migration is additive. Existing CMS tables and routes remain intact;
-- the legacy site_settings rows continue to provide fallback content until
-- the CMS is made school-scoped in a later phase.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null unique,
  slug text not null unique,
  name text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schools_organization_id_idx on public.schools (organization_id);

create table if not exists public.school_websites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  school_id uuid not null unique references public.schools(id) on delete cascade,
  design_template text not null default 'design-1' check (design_template in ('design-1', 'design-2')),
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_family text,
  website_title text,
  website_description text,
  status text not null default 'active' check (status in ('active', 'draft', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_websites_organization_id_idx on public.school_websites (organization_id);

create table if not exists public.school_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists school_domains_school_id_idx on public.school_domains (school_id);

alter table public.organizations enable row level security;
alter table public.schools enable row level security;
alter table public.school_websites enable row level security;
alter table public.school_domains enable row level security;

drop policy if exists "organizations_read_public" on public.organizations;
create policy "organizations_read_public" on public.organizations for select using (is_active);
drop policy if exists "schools_read_public" on public.schools;
create policy "schools_read_public" on public.schools for select using (is_active);
drop policy if exists "school_websites_read_public" on public.school_websites;
create policy "school_websites_read_public" on public.school_websites for select using (status = 'active');
drop policy if exists "school_domains_read_public" on public.school_domains;
create policy "school_domains_read_public" on public.school_domains for select using (is_active);

drop policy if exists "organizations_write_admin" on public.organizations;
create policy "organizations_write_admin" on public.organizations for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "schools_write_admin" on public.schools;
create policy "schools_write_admin" on public.schools for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "school_websites_write_admin" on public.school_websites;
create policy "school_websites_write_admin" on public.school_websites for all using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "school_domains_write_admin" on public.school_domains;
create policy "school_domains_write_admin" on public.school_domains for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.organizations (code, name)
values ('ORG001', 'Default Organization')
on conflict (code) do nothing;

insert into public.schools (organization_id, code, slug, name, is_default)
select id, 'SCH001', 'default', 'Your School Name', true
from public.organizations where code = 'ORG001'
on conflict (code) do nothing;

insert into public.school_websites (organization_id, school_id, design_template, status)
select s.organization_id, s.id, 'design-1', 'active'
from public.schools s
where s.code = 'SCH001'
on conflict (school_id) do nothing;
