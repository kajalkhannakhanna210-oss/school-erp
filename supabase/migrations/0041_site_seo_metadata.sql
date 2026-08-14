create table if not exists public.site_seo_metadata (
  path text primary key,
  title text,
  description text,
  canonical_path text,
  og_title text,
  og_description text,
  og_image text,
  indexable boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_seo_metadata enable row level security;
drop policy if exists "site_seo_public_read" on public.site_seo_metadata;
create policy "site_seo_public_read" on public.site_seo_metadata for select using (true);
drop policy if exists "site_seo_admin_write" on public.site_seo_metadata;
create policy "site_seo_admin_write" on public.site_seo_metadata for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.site_seo_metadata (path, title, description)
values
  ('/', 'School ERP & School Management System', 'Manage students, teachers, fees, attendance, examinations, notices, reports, and school administration with a modern school ERP system.'),
  ('/admissions', 'School Admissions', 'Apply online and find important information about school admissions and enrollment.'),
  ('/contact', 'Contact Us', 'Contact the school office for admissions, academic information, fees, facilities, and general enquiries.'),
  ('/events', 'School News & Events', 'Read the latest school news, announcements, activities, and upcoming events.'),
  ('/gallery', 'School Gallery', 'Explore photographs and moments from school life, learning, activities, and the wider school community.'),
  ('/notices', 'School Notices', 'Read current school notices, announcements, dates, and important information for families.'),
  ('/fee-structure', 'School Fee Structure', 'View published school fee details and contact the office for clarification about applicable charges.')
on conflict (path) do nothing;
