-- Additive school logo storage. Existing school data and logo_url values remain unchanged.
insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;

drop policy if exists school_logos_public_read on storage.objects;
create policy school_logos_public_read on storage.objects for select
using (bucket_id = 'school-logos');

drop policy if exists school_logos_super_admin_write on storage.objects;
create policy school_logos_super_admin_write on storage.objects for all
using (bucket_id = 'school-logos' and public.is_super_admin())
with check (bucket_id = 'school-logos' and public.is_super_admin());
