create table if not exists public.login_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  login_identifier text not null,
  device_id text not null,
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists login_audit_user_id_idx on public.login_audit (user_id, login_at desc);
create index if not exists login_audit_device_id_idx on public.login_audit (device_id, login_at desc);

alter table public.login_audit enable row level security;
create policy "login_audit_insert_own" on public.login_audit for insert with check (user_id = auth.uid());
create policy "login_audit_update_own" on public.login_audit for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "login_audit_read_admin" on public.login_audit for select using (public.is_super_admin());
