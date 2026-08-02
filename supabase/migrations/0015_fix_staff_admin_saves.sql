-- Service-role writes are made only after the server-side super-admin guard.
-- Allow that trusted path through the HR column protection trigger.
create or replace function public.protect_staff_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_super_admin() then
    new.employee_id := old.employee_id;
    new.salary := old.salary;
    new.department := old.department;
    new.designation := old.designation;
    new.joining_date := old.joining_date;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;
