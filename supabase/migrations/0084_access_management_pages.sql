insert into public.system_pages (module_code, module_name, page_code, page_name, route, display_order)
values
 ('security','Security','organisation_page_access','Organisation Page Access','/access/organisations',182),
 ('security','Security','staff_page_access','Staff Page Access','/access/staff',183)
on conflict (page_code) do update set page_name = excluded.page_name, route = excluded.route;

insert into public.permissions (key, label)
values ('organisation_page_access.view', 'View organisation page access'), ('staff_page_access.view', 'View staff page access'), ('staff_page_access.manage', 'Manage staff page access')
on conflict (key) do nothing;

insert into public.role_page_access (role, page_key, icon)
values ('super_admin', 'organisation_page_access', '▣'), ('super_admin', 'staff_page_access', '▣')
on conflict (role, page_key) do nothing;

-- Existing organisations already had the legacy access-management area. Keep
-- Staff Page Access available to organisation administrators, while the
-- organisation assignment screen remains Super Admin-only.
insert into public.organisation_page_access (organisation_id, page_id, is_enabled)
select o.id, p.id, true
from public.organizations o cross join public.system_pages p
where p.page_code = 'staff_page_access'
on conflict (organisation_id, page_id) do update set is_enabled = true;
insert into public.role_permissions (role_id, permission_key)
select r.id, x.permission_key
from public.staff_roles r
cross join (values ('staff_page_access.view'), ('staff_page_access.manage')) x(permission_key)
where r.role_code = 'ORGANISATION_ADMIN'
on conflict do nothing;

notify pgrst, 'reload schema';
