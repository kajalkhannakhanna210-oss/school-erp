create table if not exists public.impersonation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  admin_role public.user_role not null,
  organization_id uuid references public.organizations(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  target_user_id uuid not null references public.profiles(id) on delete restrict,
  target_user_role text not null check (target_user_role in ('staff', 'student')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reason text,
  status text not null
);
alter table public.impersonation_audit_logs enable row level security;
create policy "impersonation_audit_admin_read" on public.impersonation_audit_logs for select using (public.is_super_admin() or admin_user_id = auth.uid());
create policy "impersonation_audit_admin_insert" on public.impersonation_audit_logs for insert with check (public.is_super_admin() or admin_user_id = auth.uid());
insert into public.role_page_access(role, page_key) values ('super_admin', 'login_as_user') on conflict do nothing;
insert into public.role_page_access(role, page_key) values ('organization_admin', 'login_as_user') on conflict do nothing;
