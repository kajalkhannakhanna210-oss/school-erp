-- Restore the upload policy for student photos in remote environments where
-- the storage bucket existed but its object policies were missing.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'student_photos_write_admin') then
    create policy "student_photos_write_admin"
      on storage.objects for all
      using (bucket_id = 'student-photos' and public.is_super_admin())
      with check (bucket_id = 'student-photos' and public.is_super_admin());
  end if;
end $$;
