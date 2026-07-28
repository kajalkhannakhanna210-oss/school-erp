-- Demo content for a new school website. This migration is idempotent, so it
-- preserves real CMS content that may already have been entered.

insert into public.site_settings (key, value) values
  ('school_name', 'Greenfield International School'),
  ('contact_email', 'admissions@greenfieldschool.edu.in'),
  ('contact_phone', '+91 11 2345 6789'),
  ('contact_address', '123 Education Lane, Knowledge Park, New Delhi, India 110001')
on conflict (key) do nothing;

insert into public.notices (title, body, publish_date)
select * from (values
  ('Admissions are now open for the 2026–27 academic session', 'Applications are open for all grades. Please contact the admissions team to arrange a campus visit.', date '2026-07-24'),
  ('Parent–teacher meeting scheduled for all senior classes', 'The next parent–teacher meeting will be held on campus. Detailed timings will be shared by class teachers.', date '2026-07-20'),
  ('Independence Day celebration: student participation registrations open', 'Students may register with their class teachers for cultural and sporting activities.', date '2026-07-16')
) as sample(title, body, publish_date)
where not exists (select 1 from public.notices n where n.title = sample.title);

insert into public.events (title, description, event_date)
select * from (values
  ('School Open House', 'Meet our teachers and explore learning spaces across campus.', date '2026-08-12'),
  ('Annual Sports Day', 'A joyful day of teamwork, perseverance, and school spirit.', date '2026-08-21'),
  ('Young Makers Showcase', 'Celebrating student ideas, art, and imagination.', date '2026-09-05')
) as sample(title, description, event_date)
where not exists (select 1 from public.events e where e.title = sample.title);

insert into public.gallery_albums (title)
select 'Campus Life'
where not exists (select 1 from public.gallery_albums where title = 'Campus Life');

-- These example images are public placeholders. Upload your own images via
-- Website CMS to replace them; the public site accepts both CMS storage paths
-- and absolute https URLs during this demo phase.
insert into public.gallery_images (album_id, image_path, caption)
select album.id, sample.image_path, sample.caption
from public.gallery_albums album
cross join (values
  ('https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', 'Learning together'),
  ('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80', 'Curiosity in action'),
  ('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80', 'Creative expression'),
  ('https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80', 'School community')
) as sample(image_path, caption)
where album.title = 'Campus Life'
  and not exists (
    select 1 from public.gallery_images image
    where image.album_id = album.id and image.caption = sample.caption
  );
