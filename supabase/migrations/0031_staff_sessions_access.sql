insert into public.role_page_access (role, page_key)
values ('super_admin', 'staff_sessions')
on conflict (role, page_key) do nothing;
