-- Add polished banner images to the starter events. These are external URLs,
-- which the public site supports alongside Supabase Storage paths.
update public.events
set image_path = case title
  when 'School Open House' then 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85'
  when 'Annual Sports Day' then 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=85'
  when 'Young Makers Showcase' then 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=85'
end
where title in ('School Open House', 'Annual Sports Day', 'Young Makers Showcase')
  and (image_path is null or image_path = '');
