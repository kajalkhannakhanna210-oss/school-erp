-- Local development mappings for testing multiple school websites from one app.
-- Production domains can be added later through the same school_domains table.

insert into public.schools (organization_id, code, slug, name, is_default)
select id, 'SCH002', 'school2', 'Design 2 School', false
from public.organizations
where code = 'ORG001'
on conflict (code) do nothing;

insert into public.school_websites (organization_id, school_id, design_template, status)
select s.organization_id, s.id, 'design-2', 'active'
from public.schools s
where s.code = 'SCH002'
on conflict (school_id) do update set design_template = excluded.design_template, status = excluded.status;

insert into public.school_domains (organization_id, school_id, domain, is_primary)
select s.organization_id, s.id, 'school1.local', true
from public.schools s
where s.code = 'SCH001'
on conflict (domain) do update set school_id = excluded.school_id, organization_id = excluded.organization_id, is_active = true;

insert into public.school_domains (organization_id, school_id, domain, is_primary)
select s.organization_id, s.id, 'school.local', true
from public.schools s
where s.code = 'SCH002'
on conflict (domain) do update set school_id = excluded.school_id, organization_id = excluded.organization_id, is_active = true;
