-- Repair older environments where the master-data scope migration was
-- skipped or applied without refreshing PostgREST's schema cache.
alter table public.sections
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.sections
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

alter table public.classes
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.classes
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

alter table public.class_teachers
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.class_teachers
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

create index if not exists sections_scope_idx
  on public.sections(organization_id, school_id);
create index if not exists classes_scope_idx
  on public.classes(organization_id, school_id);
create index if not exists class_teachers_scope_idx
  on public.class_teachers(organization_id, school_id);

notify pgrst, 'reload schema';
