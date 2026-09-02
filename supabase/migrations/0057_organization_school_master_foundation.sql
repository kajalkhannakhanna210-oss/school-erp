-- Phase 1: system-level organization and school master foundation.
-- Additive only: existing auth, profiles, staff, roles, permissions, and data stay intact.

alter type public.user_role add value if not exists 'organization_admin';
alter type public.user_role add value if not exists 'school_admin';

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  school_id uuid references public.schools(id) on delete restrict,
  membership_role text not null check (membership_role in ('organization_admin', 'school_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, organization_id, school_id, membership_role),
  check (membership_role = 'organization_admin' or school_id is not null)
);

create index if not exists organization_memberships_profile_idx on public.organization_memberships(profile_id);
create index if not exists organization_memberships_organization_idx on public.organization_memberships(organization_id);
create index if not exists organization_memberships_school_idx on public.organization_memberships(school_id);

create or replace function public.organization_membership_school_matches_org()
returns trigger
language plpgsql
as $$
begin
  if new.school_id is not null and not exists (
    select 1 from public.schools s where s.id = new.school_id and s.organization_id = new.organization_id
  ) then
    raise exception 'School does not belong to the selected organization';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_membership_school_org_guard on public.organization_memberships;
create trigger organization_membership_school_org_guard
before insert or update on public.organization_memberships
for each row execute function public.organization_membership_school_matches_org();

alter table public.staff add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.staff add column if not exists primary_school_id uuid references public.schools(id) on delete restrict;
create index if not exists staff_organization_id_idx on public.staff(organization_id);
create index if not exists staff_primary_school_id_idx on public.staff(primary_school_id);

alter table public.organization_memberships enable row level security;

drop policy if exists organization_memberships_read_own_or_super on public.organization_memberships;
create policy organization_memberships_read_own_or_super on public.organization_memberships for select
using (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists organization_memberships_write_super on public.organization_memberships;
create policy organization_memberships_write_super on public.organization_memberships for all
using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists organizations_read_org_members on public.organizations;
drop policy if exists organizations_read_public on public.organizations;
create policy organizations_read_public on public.organizations for select to anon
using (is_active);
create policy organizations_read_org_members on public.organizations for select to authenticated
using (public.is_super_admin() or exists (
  select 1 from public.organization_memberships m
  where m.organization_id = organizations.id and m.profile_id = auth.uid() and m.is_active = true
));

drop policy if exists schools_read_org_members on public.schools;
drop policy if exists schools_read_public on public.schools;
create policy schools_read_public on public.schools for select to anon
using (is_active);
create policy schools_read_org_members on public.schools for select to authenticated
using (public.is_super_admin() or exists (
  select 1 from public.organization_memberships m
  where m.organization_id = schools.organization_id and m.profile_id = auth.uid() and m.is_active = true
));

insert into public.role_page_access (role, page_key, icon)
values
  ('super_admin', 'organization_master', '◎'),
  ('super_admin', 'school_master', '⌂'),
  ('organization_admin', 'dashboard', '▦'),
  ('school_admin', 'dashboard', '▦')
on conflict (role, page_key) do nothing;

comment on column public.staff.organization_id is 'Nullable transition link; existing staff ownership must be mapped explicitly.';
comment on column public.staff.primary_school_id is 'Nullable transition link; primary school is distinct from future authorized school scope.';
