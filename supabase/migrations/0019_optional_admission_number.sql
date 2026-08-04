-- Admission numbers are optional. Blank registration values must remain NULL
-- instead of receiving the former sequence-generated default.
alter table public.students
  alter column admission_number drop not null,
  alter column admission_number drop default;
