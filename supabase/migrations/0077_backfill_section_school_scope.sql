-- Backfill legacy section rows from their owning class so list queries,
-- duplicate checks, and school-scoped writes use the same ownership.
update public.sections sec
set
  organization_id = cls.organization_id,
  school_id = cls.school_id
from public.classes cls
where cls.id = sec.class_id
  and (sec.organization_id is null or sec.school_id is null);

create index if not exists sections_school_name_idx
  on public.sections(school_id, name);

notify pgrst, 'reload schema';
