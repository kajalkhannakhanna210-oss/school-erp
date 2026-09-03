-- Seed the path-based demo tenant using the existing first active
-- organisation. No organisation UUID is hard-coded.
insert into public.schools (organization_id, code, slug, name, is_default, is_active)
select o.id, 'SCH002', 'school2', 'Design 2 School', false, true
from public.organizations o
where o.is_active = true
order by o.created_at, o.id
limit 1
on conflict (code) do update set slug = excluded.slug, name = excluded.name, is_default = false, is_active = true;

insert into public.school_websites (organization_id, school_id, design_template, status)
select s.organization_id, s.id, 'design-2', 'active'
from public.schools s
where s.code = 'SCH002'
on conflict (school_id) do update set design_template = excluded.design_template, status = excluded.status, updated_at = now();
