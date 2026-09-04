-- Preserve the latest wing status remark and keep an audit trail for every change.
alter table public.school_wings
  add column if not exists status_remark text;

create table if not exists public.wing_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  wing_id uuid not null references public.school_wings(id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wing_status_history_scope_idx
  on public.wing_status_history(school_id, wing_id, created_at desc);

alter table public.wing_status_history enable row level security;
drop policy if exists wing_status_history_tenant_access on public.wing_status_history;
create policy wing_status_history_tenant_access on public.wing_status_history
  for all to authenticated
  using (public.has_school_access(organization_id, school_id))
  with check (public.has_school_access(organization_id, school_id));
