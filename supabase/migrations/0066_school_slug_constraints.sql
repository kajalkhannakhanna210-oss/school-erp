-- schools.slug is the existing school URL field. Keep it globally unique and
-- enforce the URL-safe/reserved-path rules at the database boundary.
alter table public.schools drop constraint if exists schools_slug_format_check;
alter table public.schools add constraint schools_slug_format_check
  check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in ('superadmin', 'admin', 'api', '_next', 'login', 'logout', 'assets', 'images'));

alter table public.school_websites drop constraint if exists school_websites_design_template_check;
alter table public.school_websites add constraint school_websites_design_template_check
  check (design_template in ('design-1', 'design-2'));
