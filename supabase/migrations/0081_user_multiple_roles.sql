-- Future-proof role assignments. profiles.role_id remains the current primary
-- role for compatibility and fast lookups; this table supports additional
-- organisation/school-specific roles later.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id, organization_id, school_id)
);

create index if not exists user_roles_user_idx on public.user_roles(user_id);
create index if not exists user_roles_school_idx on public.user_roles(school_id);
create unique index if not exists user_roles_one_primary_uq on public.user_roles(user_id) where is_primary;

create or replace function public.validate_user_role_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_scope text;
begin
  select role_scope into assigned_scope from public.staff_roles where id = new.role_id and is_active;
  if assigned_scope is null then raise exception 'Role is not active or does not exist'; end if;
  if new.school_id is not null and not exists (select 1 from public.schools s where s.id = new.school_id and s.organization_id = new.organization_id) then
    raise exception 'School does not belong to the selected organization';
  end if;
  if assigned_scope = 'SCHOOL' and new.school_id is null then raise exception 'School roles require a school scope'; end if;
  if assigned_scope = 'ORGANISATION' and new.school_id is not null then raise exception 'Organisation roles cannot have a school scope'; end if;
  return new;
end;
$$;
drop trigger if exists user_roles_scope_guard on public.user_roles;
create trigger user_roles_scope_guard before insert or update on public.user_roles for each row execute function public.validate_user_role_scope();

-- Backfill the existing single primary assignment where its role has a valid
-- tenant scope. Invalid legacy rows remain available through profiles.role_id.
insert into public.user_roles (user_id, role_id, organization_id, school_id, is_primary)
select p.id, p.role_id, p.organization_id, case when r.role_scope = 'SCHOOL' then p.school_id else null end, true
from public.profiles p join public.staff_roles r on r.id = p.role_id
where p.role_id is not null and r.is_active
  and (r.role_scope = 'ORGANISATION' and p.organization_id is not null
    or r.role_scope = 'SCHOOL' and p.organization_id is not null and p.school_id is not null)
on conflict do nothing;

alter table public.user_roles enable row level security;
drop policy if exists user_roles_read_own_or_admin on public.user_roles;
create policy user_roles_read_own_or_admin on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists user_roles_manage_admin on public.user_roles;
create policy user_roles_manage_admin on public.user_roles for all using (public.is_super_admin()) with check (public.is_super_admin());

notify pgrst, 'reload schema';
