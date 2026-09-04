-- Repair older linked projects where the school logo migration was recorded
-- but the Storage bucket was not created.
insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do update set public = true;

drop policy if exists school_logos_public_read on storage.objects;
create policy school_logos_public_read on storage.objects
  for select to public
  using (bucket_id = 'school-logos');

drop policy if exists school_logos_super_admin_write on storage.objects;
create policy school_logos_super_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'school-logos' and public.is_super_admin())
  with check (bucket_id = 'school-logos' and public.is_super_admin());
