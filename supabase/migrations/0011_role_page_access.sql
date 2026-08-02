-- Configurable dashboard-menu visibility by role. Existing RLS and route
-- checks remain the source of truth for access to protected data/actions.
create table public.role_page_access (
  role public.user_role not null,
  page_key text not null,
  primary key (role, page_key)
);

alter table public.role_page_access enable row level security;

create policy "role_page_access_read_authenticated"
  on public.role_page_access for select using (auth.uid() is not null);

create policy "role_page_access_write_admin"
  on public.role_page_access for all
  using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.role_page_access (role, page_key) values
  ('super_admin', 'dashboard'), ('super_admin', 'master'), ('super_admin', 'sessions'),
  ('super_admin', 'classes'), ('super_admin', 'sections'), ('super_admin', 'class_teachers'),
  ('super_admin', 'students'), ('super_admin', 'staff'), ('super_admin', 'attendance'),
  ('super_admin', 'exams'), ('super_admin', 'fees'), ('super_admin', 'reports'),
  ('super_admin', 'cms'), ('super_admin', 'profile'), ('super_admin', 'role_access'),
  ('staff', 'dashboard'), ('staff', 'students'), ('staff', 'attendance'),
  ('staff', 'exams'), ('staff', 'reports'), ('staff', 'profile'),
  ('student', 'dashboard'), ('student', 'attendance'), ('student', 'exams'),
  ('student', 'payments'), ('student', 'profile');
