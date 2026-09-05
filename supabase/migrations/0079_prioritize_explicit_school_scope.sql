-- Explicit staff school assignments take precedence over legacy organisation
-- memberships that implicitly granted every school.
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
      and (
        not exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL')
        or exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL' and (s.scope_type = 'ALL' or s.resource_id = target_school_id))
      )
  ) or (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = target_organization_id and p.user_type = 'ORGANISATION_USER' and p.is_active)
    and (
      not exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL')
      or exists (select 1 from public.staff_module_scopes s where s.staff_id = auth.uid() and s.module_key = 'school_access' and s.action_key = 'ALL' and (s.scope_type = 'ALL' or s.resource_id = target_school_id))
    )
  )
$$;

notify pgrst, 'reload schema';
