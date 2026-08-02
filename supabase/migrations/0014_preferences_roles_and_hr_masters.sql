-- Phase 10: user preferences, multi-role access, and HR master data.

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  primary key (profile_id, role)
);

insert into public.profile_roles (profile_id, role)
select id, role from public.profiles
on conflict do nothing;

create or replace function public.sync_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profile_roles (profile_id, role) values (new.id, new.role)
  on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_profile_role();

-- A profile's active role may only be changed to one of its assigned roles.
-- This closes the existing self-profile update policy from being used to
-- elevate privileges directly.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_super_admin() and current_setting('app.allow_role_switch', true) is distinct from 'true' then
    raise exception 'Role can only be changed through the role switch function';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_role before update of role on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.set_my_active_role(next_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profile_roles where profile_id = auth.uid() and role = next_role) then
    raise exception 'Role is not assigned to this account';
  end if;
  perform set_config('app.allow_role_switch', 'true', true);
  update public.profiles set role = next_role where id = auth.uid();
end;
$$;
grant execute on function public.set_my_active_role(public.user_role) to authenticated;

alter table public.profile_roles enable row level security;
create policy "profile_roles_read_own_or_admin" on public.profile_roles for select
  using (profile_id = auth.uid() or public.is_super_admin());
create policy "profile_roles_manage_admin" on public.profile_roles for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.designations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.departments enable row level security;
alter table public.designations enable row level security;
create policy "departments_read_authenticated" on public.departments for select using (auth.uid() is not null);
create policy "departments_write_admin" on public.departments for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "designations_read_authenticated" on public.designations for select using (auth.uid() is not null);
create policy "designations_write_admin" on public.designations for all using (public.is_super_admin()) with check (public.is_super_admin());
