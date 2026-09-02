-- Extend the existing staff_module_scopes table for per-staff school access.
-- Page permissions remain in role_page_access; these rows are data scope only.

alter table public.staff_module_scopes
  drop constraint if exists staff_module_scopes_scope_type_check;

alter table public.staff_module_scopes
  add constraint staff_module_scopes_scope_type_check
  check (scope_type in ('ALL', 'CLASS', 'SECTION', 'OWN_ASSIGNED', 'SCHOOL'));

create or replace function public.validate_staff_school_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.module_key = 'school_access' and new.scope_type = 'SCHOOL' then
    if not exists (
      select 1
      from public.staff st
      join public.schools sc on sc.organization_id = st.organization_id
      where st.id = new.staff_id
        and st.organization_id is not null
        and sc.id = new.resource_id
    ) then
      raise exception 'School is not authorized for this staff organization';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_school_scope_org_guard on public.staff_module_scopes;
create trigger staff_school_scope_org_guard
before insert or update on public.staff_module_scopes
for each row execute function public.validate_staff_school_scope();

notify pgrst, 'reload schema';
