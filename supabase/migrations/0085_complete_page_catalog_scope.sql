insert into public.system_pages (module_code, module_name, page_code, page_name, route, display_order)
values
 ('students','Students','student_id_cards','Student ID Cards','/students/id-cards',23),
 ('students','Students','admission_allotment','Admission Allotment','/students/admission-allotment',24),
 ('admissions','Admissions','staff_assignment_rules','Staff Assignment Rules','/admissions-admin/staff-assignment-rules',32),
 ('settings','Settings','cms','Website CMS','/cms',171),
 ('reports','Reports','active_users','Active Users','/reports/active-users',91),
 ('reports','Reports','login_activity','Login Activity','/reports/login-activity',92),
 ('reports','Reports','access_logs','Access Logs','/reports/access-logs',93),
 ('settings','Settings','api_explorer','API Explorer','/api-explorer',172)
on conflict (page_code) do update set page_name = excluded.page_name, route = excluded.route;

insert into public.organisation_page_access (organisation_id, page_id, is_enabled)
select o.id, p.id, true from public.organizations o cross join public.system_pages p
where p.page_code in ('student_id_cards','admission_allotment','staff_assignment_rules','cms','active_users','login_activity','access_logs','api_explorer')
on conflict (organisation_id, page_id) do nothing;

create or replace function public.has_effective_page_access(target_page_code text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1
    from public.profiles u
    join public.system_pages p on p.page_code = target_page_code and p.is_active
    where u.id = auth.uid() and u.is_active and u.organization_id is not null
      and public.organisation_has_page(u.organization_id, p.id)
      and (
        exists (select 1 from public.staff_page_access s where s.staff_user_id = u.id and s.organisation_id = u.organization_id and (s.school_id is null or s.school_id = u.school_id) and s.page_id = p.id and s.is_enabled)
        or not exists (select 1 from public.staff_page_access s where s.staff_user_id = u.id and s.organisation_id = u.organization_id and (s.school_id is null or s.school_id = u.school_id))
      )
      and (
        exists (select 1 from public.role_page_assignments r where r.organisation_id = u.organization_id and r.role_id = u.role_id and r.page_id = p.id and r.is_enabled)
        or exists (select 1 from public.role_page_access legacy where legacy.role::text = u.role::text and legacy.page_key = target_page_code)
        or public.has_staff_permission(target_page_code || '.view')
      )
  )
$$;

notify pgrst, 'reload schema';
