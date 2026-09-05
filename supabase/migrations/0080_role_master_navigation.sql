insert into public.permissions (key, label)
values ('role_master.view', 'View role master'), ('role_master.manage', 'Manage roles and permissions')
on conflict (key) do nothing;

insert into public.role_page_access (role, page_key, icon)
values ('super_admin', 'role_master', '⚙')
on conflict (role, page_key) do nothing;

notify pgrst, 'reload schema';
