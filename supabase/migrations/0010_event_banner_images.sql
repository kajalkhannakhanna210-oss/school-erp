-- Add polished banner images to the starter events. These are external URLs,
-- which the public site supports alongside Supabase Storage paths.
update public.events
set image_path = case title
  when 'School Open House' then '/remote-images/photo-1509062522246-3755977927d7.jpg'
  when 'Annual Sports Day' then '/remote-images/photo-1523050854058-8df90110c9f1.jpg'
  when 'Young Makers Showcase' then '/remote-images/photo-1503676260728-1c00da094a0b.jpg'
end
where title in ('School Open House', 'Annual Sports Day', 'Young Makers Showcase')
  and (image_path is null or image_path = '');
