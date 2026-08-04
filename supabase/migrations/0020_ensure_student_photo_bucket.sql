-- Ensure the private bucket exists in remote projects where the original
-- storage migration was not applied completely.
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;
