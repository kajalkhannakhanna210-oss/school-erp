create table if not exists public.organization_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.school_status_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists organization_status_history_org_idx on public.organization_status_history (organization_id, created_at desc);
create index if not exists school_status_history_school_idx on public.school_status_history (school_id, created_at desc);

alter table public.organization_status_history enable row level security;
alter table public.school_status_history enable row level security;

create policy "organization_status_history_admin" on public.organization_status_history for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "school_status_history_admin" on public.school_status_history for all using (public.is_super_admin()) with check (public.is_super_admin());

notify pgrst, 'reload schema';
