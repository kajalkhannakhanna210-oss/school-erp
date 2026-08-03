-- Allow each event to have a photo gallery in addition to its optional banner.
create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index event_images_event_id_created_at_idx on public.event_images (event_id, created_at desc);

alter table public.event_images enable row level security;

create policy "event_images_read_public" on public.event_images
  for select using (true);

create policy "event_images_write_admin" on public.event_images
  for all using (public.is_super_admin()) with check (public.is_super_admin());
