alter table public.organizations
  add column if not exists inactive_reason text;

alter table public.schools
  add column if not exists inactive_reason text;

notify pgrst, 'reload schema';
