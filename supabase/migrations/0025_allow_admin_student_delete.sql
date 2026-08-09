-- Allow super administrators to delete student rows.
-- Related student-owned records use ON DELETE CASCADE where applicable.
create policy "students_delete_admin"
  on public.students for delete
  using (public.is_super_admin());
