-- Add tenant/school scope to the existing Master Data tables.
-- Existing rows are intentionally preserved and remain nullable for migration compatibility.
alter table public.academic_sessions add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.academic_sessions add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.classes add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.classes add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.sections add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.sections add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.class_teachers add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.class_teachers add column if not exists school_id uuid references public.schools(id) on delete cascade;

create index if not exists academic_sessions_scope_idx on public.academic_sessions(organization_id, school_id);
create index if not exists classes_scope_idx on public.classes(organization_id, school_id);
create index if not exists sections_scope_idx on public.sections(organization_id, school_id);
create index if not exists class_teachers_scope_idx on public.class_teachers(organization_id, school_id);

create or replace function public.validate_master_data_school_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.school_id is not null then
    if new.organization_id is null then
      raise exception 'organization_id is required when school_id is set';
    end if;
    if not exists (select 1 from public.schools s where s.id = new.school_id and s.organization_id = new.organization_id) then
      raise exception 'School does not belong to the selected organization';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists academic_sessions_scope_guard on public.academic_sessions;
create trigger academic_sessions_scope_guard before insert or update on public.academic_sessions for each row execute function public.validate_master_data_school_scope();
drop trigger if exists classes_scope_guard on public.classes;
create trigger classes_scope_guard before insert or update on public.classes for each row execute function public.validate_master_data_school_scope();
drop trigger if exists sections_scope_guard on public.sections;
create trigger sections_scope_guard before insert or update on public.sections for each row execute function public.validate_master_data_school_scope();
drop trigger if exists class_teachers_scope_guard on public.class_teachers;
create trigger class_teachers_scope_guard before insert or update on public.class_teachers for each row execute function public.validate_master_data_school_scope();
