-- Repair older environments where the academic session scope migration was
-- skipped or applied without refreshing PostgREST's schema cache.
alter table public.academic_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.academic_sessions
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

create index if not exists academic_sessions_scope_idx
  on public.academic_sessions(organization_id, school_id);

-- Make the new columns visible to Supabase/PostgREST immediately.
notify pgrst, 'reload schema';
