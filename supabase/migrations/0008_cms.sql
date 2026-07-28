-- Phase 9: Website CMS
-- Introduces genuinely public (unauthenticated) read access for the first
-- time — everything before this required a signed-in user. See the
-- middleware fix in lib/supabase/middleware.ts, made alongside this
-- migration, for the routing half of "public" actually working.
-- Run after 0001-0007.

-- ============================================================
-- Site pages — Home, About Us, Principal's/Chairman's Message, Facilities,
-- Academics, Admissions. One row per page, keyed by a fixed slug.
-- ============================================================

create table public.site_pages (
  slug text primary key,
  title text not null,
  content text not null default '',
  image_path text,
  updated_at timestamptz not null default now()
);

insert into public.site_pages (slug, title) values
  ('home', 'Home'),
  ('about', 'About Us'),
  ('principal-message', 'Principal''s Message'),
  ('chairman-message', 'Chairman''s Message'),
  ('facilities', 'Facilities'),
  ('academics', 'Academics'),
  ('admissions', 'Admissions');

alter table public.site_pages enable row level security;
create policy "site_pages_read_public" on public.site_pages for select using (true);
create policy "site_pages_write_admin" on public.site_pages for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Site settings — small key/value store for the footer and contact page
-- (school name, contact details, social links). Phase 10 (System Settings)
-- is where this gets a proper admin UI and grows to cover more; this phase
-- only needed enough to make the footer and Contact page non-empty, so it
-- builds the table Phase 10 extends rather than duplicating it later.
-- ============================================================

create table public.site_settings (
  key text primary key,
  value text not null default ''
);

insert into public.site_settings (key, value) values
  ('school_name', 'Your School Name'),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('contact_address', ''),
  ('facebook_url', ''),
  ('twitter_url', ''),
  ('instagram_url', '');

alter table public.site_settings enable row level security;
create policy "site_settings_read_public" on public.site_settings for select using (true);
create policy "site_settings_write_admin" on public.site_settings for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Notices — shown on the public site AND in the student/staff dashboards.
-- publish_date makes "publish date" a real scheduling mechanism, not just a
-- label: a notice with a future publish_date is invisible to everyone but
-- Super Admin until that date arrives, enforced by the read policy itself
-- rather than the UI choosing not to show it.
-- ============================================================

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  attachment_path text,
  publish_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.notices enable row level security;
create policy "notices_read_published" on public.notices for select
  using (publish_date <= current_date or public.is_super_admin());
create policy "notices_write_admin" on public.notices for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Gallery — albums containing images.
-- ============================================================

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums (id) on delete cascade,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.gallery_albums enable row level security;
alter table public.gallery_images enable row level security;
create policy "gallery_albums_read_public" on public.gallery_albums for select using (true);
create policy "gallery_albums_write_admin" on public.gallery_albums for all
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "gallery_images_read_public" on public.gallery_images for select using (true);
create policy "gallery_images_write_admin" on public.gallery_images for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Events
-- ============================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date date not null,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "events_read_public" on public.events for select using (true);
create policy "events_write_admin" on public.events for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================
-- Contact messages — anyone can submit (the public form), only Super Admin
-- can read them. No public SELECT at all, unlike everything else in this
-- migration — a submitted message isn't content, it's someone's private
-- correspondence with the school.
-- ============================================================

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
create policy "contact_messages_insert_public" on public.contact_messages for insert with check (true);
create policy "contact_messages_select_admin" on public.contact_messages for select using (public.is_super_admin());
create policy "contact_messages_update_admin" on public.contact_messages for update
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "contact_messages_delete_admin" on public.contact_messages for delete using (public.is_super_admin());

-- ============================================================
-- Storage: public site media (page images, gallery, events, notice
-- attachments). Unlike student/staff photos, this bucket is genuinely
-- public — marketing content, not records about a specific person — so
-- files are served via plain public URLs, not signed ones.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

create policy "site_media_read_public"
  on storage.objects for select
  using (bucket_id = 'site-media');

create policy "site_media_write_admin"
  on storage.objects for all
  using (bucket_id = 'site-media' and public.is_super_admin())
  with check (bucket_id = 'site-media' and public.is_super_admin());
