-- Migration 0051: Admission Enquiry module scopes and permissions

-- 1. Reusable staff-module scope table
create table if not exists public.staff_module_scopes (
  id bigserial primary key,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  module_key text not null,
  scope_type text not null check (scope_type in ('ALL','CLASS','SECTION','OWN_ASSIGNED')),
  resource_id uuid null
);

-- enforce logical uniqueness (treat NULL resource_id as '')
create unique index if not exists ux_staff_module_scopes_unique
  on public.staff_module_scopes (staff_id, module_key, scope_type, coalesce(resource_id::text, ''));

create index if not exists idx_staff_module_scopes_staff on public.staff_module_scopes(staff_id);
create index if not exists idx_staff_module_scopes_module on public.staff_module_scopes(module_key);
create index if not exists idx_staff_module_scopes_resource on public.staff_module_scopes(resource_id);

-- 2. Admission enquiry permission keys
insert into public.permissions (key, label) values
  ('admission_enquiry.view', 'View admission enquiries'),
  ('admission_enquiry.create', 'Create admission enquiries'),
  ('admission_enquiry.edit', 'Edit admission enquiries'),
  ('admission_enquiry.assign', 'Assign admission enquiries'),
  ('admission_enquiry.reassign', 'Reassign admission enquiries'),
  ('admission_enquiry.followup', 'Add follow-ups to admission enquiries'),
  ('admission_enquiry.change_status', 'Change enquiry status'),
  ('admission_enquiry.convert_won', 'Convert enquiry to Won'),
  ('admission_enquiry.mark_lost', 'Mark enquiry as Lost'),
  ('admission_enquiry.export', 'Export admission enquiries'),
  ('admission_enquiry.view_reports', 'View admission enquiry reports'),
  ('admission_enquiry.manage_configuration', 'Manage admission enquiry configuration')
on conflict (key) do nothing;

-- 3. RLS: basic protections (readable by authenticated users, writes controlled server-side)
alter table public.staff_module_scopes enable row level security;
drop policy if exists "staff_module_scopes_read_auth" on public.staff_module_scopes;
drop policy if exists "staff_module_scopes_manage_admin" on public.staff_module_scopes;
create policy "staff_module_scopes_read_auth" on public.staff_module_scopes for select using (auth.uid() is not null);
create policy "staff_module_scopes_manage_admin" on public.staff_module_scopes for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Done
