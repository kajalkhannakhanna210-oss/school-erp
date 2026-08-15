-- Migration 0044: Active Users Report Permissions
-- Register active_users in role_page_access for super_admin

insert into public.role_page_access (role, page_key, icon)
values
  ('super_admin', 'active_users', '👥')
on conflict (role, page_key) do update
set icon = excluded.icon;
