-- Repair databases where the original staff migration was skipped but marked applied.
create sequence if not exists public.employee_id_seq;

create or replace function public.generate_employee_id()
returns text
language sql
as $$
  select 'EMP' || to_char(now(), 'YYYY') || lpad(nextval('public.employee_id_seq')::text, 4, '0');
$$;

create table if not exists public.staff (
  id uuid primary key references public.profiles (id) on delete cascade,
  employee_id text not null unique default public.generate_employee_id(),
  department text,
  designation text,
  qualification text,
  mobile_number text,
  contact_email text,
  salary numeric(12, 2),
  joining_date date not null default current_date,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_select') then
    create policy "staff_select" on public.staff for select using (id = auth.uid() or public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_insert_admin') then
    create policy "staff_insert_admin" on public.staff for insert with check (public.is_super_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_update_self_or_admin') then
    create policy "staff_update_self_or_admin" on public.staff for update using (id = auth.uid() or public.is_super_admin());
  end if;
end $$;
