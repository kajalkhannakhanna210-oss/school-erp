-- Track who archived a staff member and when.
alter table public.staff
  add column if not exists inactive_date timestamptz,
  add column if not exists inactive_by uuid references public.profiles (id) on delete set null;
