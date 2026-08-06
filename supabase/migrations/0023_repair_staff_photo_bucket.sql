-- Ensure the staff profile image bucket exists on repaired databases.
insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', false)
on conflict (id) do nothing;
