-- Gallery metadata used by the CMS editor and public gallery.
alter table public.gallery_albums
  add column if not exists description text not null default '',
  add column if not exists gallery_date date not null default current_date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.event_images
  add column if not exists updated_at timestamptz not null default now();

create index if not exists gallery_albums_gallery_date_idx
  on public.gallery_albums (gallery_date desc);
