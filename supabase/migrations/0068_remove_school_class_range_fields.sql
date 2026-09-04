-- Class range is no longer configured on School Master.
alter table public.schools
  drop column if exists lowest_class,
  drop column if exists highest_class;

drop table if exists public.common_classes cascade;
delete from public.role_page_access where page_key = 'common_class_master';
