-- Three trusted login modes. This migration extends the existing profiles,
-- organizations, schools, and memberships tables; it does not create a second
-- organisation master.

alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.profiles add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists user_type text;
alter table public.profiles add column if not exists platform_role text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.organizations add column if not exists slug text;
update public.organizations set slug = lower(regexp_replace(code, '[^a-zA-Z0-9]+', '-', 'g')) where slug is null;
create unique index if not exists organizations_slug_uq on public.organizations(lower(slug)) where slug is not null;

alter table public.profiles drop constraint if exists profiles_user_type_check;
alter table public.profiles add constraint profiles_user_type_check
  check (user_type is null or user_type in ('SUPER_ADMIN', 'ORGANISATION_USER', 'SCHOOL_USER'));
alter table public.profiles drop constraint if exists profiles_platform_scope_check;
alter table public.profiles add constraint profiles_platform_scope_check
  check (user_type <> 'SUPER_ADMIN' or (organization_id is null and school_id is null));
alter table public.profiles drop constraint if exists profiles_school_scope_check;
alter table public.profiles add constraint profiles_school_scope_check
  check (user_type <> 'SCHOOL_USER' or (organization_id is not null and school_id is not null));
alter table public.profiles drop constraint if exists profiles_organisation_scope_check;
alter table public.profiles add constraint profiles_organisation_scope_check
  check (user_type <> 'ORGANISATION_USER' or (organization_id is not null and school_id is null));

create index if not exists profiles_organization_idx on public.profiles(organization_id);
create index if not exists profiles_school_idx on public.profiles(school_id);
create unique index if not exists profiles_school_username_uq
  on public.profiles(organization_id, school_id, lower(username))
  where username is not null and school_id is not null;
create unique index if not exists profiles_organisation_username_uq
  on public.profiles(organization_id, lower(username))
  where username is not null and school_id is null and organization_id is not null;
create unique index if not exists profiles_platform_username_uq
  on public.profiles(lower(username))
  where username is not null and user_type = 'SUPER_ADMIN';

-- Keep school and organisation scopes consistent even when a caller writes via
-- the service role. The service role bypasses RLS, so this trigger is required.
create or replace function public.validate_profile_tenant_scope()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.school_id is not null and not exists (
    select 1 from public.schools s where s.id = new.school_id and s.organization_id = new.organization_id
  ) then raise exception 'School does not belong to the selected organization'; end if;
  if new.user_type = 'SUPER_ADMIN' and (new.organization_id is not null or new.school_id is not null) then
    raise exception 'Super Admins cannot have tenant scope';
  end if;
  return new;
end $$;
drop trigger if exists profiles_tenant_scope_guard on public.profiles;
create trigger profiles_tenant_scope_guard before insert or update on public.profiles
for each row execute function public.validate_profile_tenant_scope();

-- Existing lower-case role data remains compatible. New records can use the
-- explicit trusted fields while legacy role checks continue to work.
update public.profiles set user_type = 'SUPER_ADMIN', platform_role = 'SUPER_ADMIN', organization_id = null, school_id = null
where role = 'super_admin' and user_type is null;
update public.profiles set user_type = 'SCHOOL_USER'
where user_type is null and school_id is not null;
update public.profiles set user_type = 'ORGANISATION_USER'
where user_type is null and organization_id is not null and school_id is null;

create table if not exists public.organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists organization_domains_org_idx on public.organization_domains(organization_id);
alter table public.organization_domains enable row level security;
drop policy if exists organization_domains_public_read on public.organization_domains;
create policy organization_domains_public_read on public.organization_domains for select to anon, authenticated using (is_active);
drop policy if exists organization_domains_super_write on public.organization_domains;
create policy organization_domains_super_write on public.organization_domains for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Trusted profile helpers for RLS. They are SECURITY DEFINER to avoid profile
-- policy recursion and never read tenant IDs from client-supplied parameters.
create or replace function public.current_profile()
returns public.profiles language sql security definer stable set search_path = public as $$
  select p from public.profiles p where p.id = auth.uid() and p.is_active = true limit 1
$$;
create or replace function public.current_user_type()
returns text language sql security definer stable set search_path = public as $$
  select coalesce((select user_type from public.profiles where id = auth.uid() and is_active),
                  case when public.is_super_admin() then 'SUPER_ADMIN' else null end)
$$;
create or replace function public.has_organisation_access(target_organization_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.current_user_type() = 'SUPER_ADMIN' or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
      and p.organization_id = target_organization_id
      and (p.user_type = 'ORGANISATION_USER' or p.user_type = 'SCHOOL_USER')
  ) or exists (
    select 1 from public.organization_memberships m where m.profile_id = auth.uid()
      and m.organization_id = target_organization_id and m.is_active
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
  )
$$;

drop policy if exists organizations_read_org_members on public.organizations;
create policy organizations_read_org_members on public.organizations for select to authenticated
using (public.has_organisation_access(id));
drop policy if exists schools_read_org_members on public.schools;
create policy schools_read_org_members on public.schools for select to authenticated
using (public.has_organisation_access(organization_id));

notify pgrst, 'reload schema';

create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid() and is_active) = 'super_admin', false)
      or coalesce((select platform_role from public.profiles where id = auth.uid() and is_active) = 'SUPER_ADMIN', false)
$$;
