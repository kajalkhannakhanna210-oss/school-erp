-- Keep school-master form submissions compatible with databases that were
-- provisioned before the academic and system settings fields were added.
alter table public.schools
  add column if not exists short_name text,
  add column if not exists logo_url text,
  add column if not exists school_type text,
  add column if not exists board text,
  add column if not exists affiliation_number text,
  add column if not exists established_year integer,
  add column if not exists contact_person text,
  add column if not exists contact_designation text,
  add column if not exists phone text,
  add column if not exists alternate_phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists country text,
  add column if not exists state text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists academic_start_month integer,
  add column if not exists medium_of_instruction text,
  add column if not exists timezone text,
  add column if not exists date_format text,
  add column if not exists currency_code text;

alter table public.schools
  drop constraint if exists schools_academic_start_month_check;

alter table public.schools
  add constraint schools_academic_start_month_check
  check (
    academic_start_month is null
    or academic_start_month between 1 and 12
  );
