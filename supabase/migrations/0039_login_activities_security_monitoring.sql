-- Append-only authentication and authorization activity stream.
-- IP addresses and user agents are retained for the configured retention period
-- and must be treated as security-sensitive personal data.
create table if not exists public.login_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_name text,
  email text,
  role public.user_role,
  event_type text not null check (event_type in (
    'successful_login', 'failed_login', 'invalid_password', 'nonexistent_user',
    'logout', 'account_locked', 'account_unlocked', 'password_reset_requested',
    'password_reset_successful', 'password_changed', 'session_expired',
    'session_revoked', 'new_device_login', 'suspicious_login_attempt',
    'rate_limit_exceeded', 'unauthorized_access_attempt', 'role_access_denied'
  )),
  status text not null check (status in ('success', 'failed', 'blocked')),
  ip_address inet,
  browser text,
  operating_system text,
  device_type text,
  user_agent text,
  approximate_location text,
  authentication_method text,
  failure_reason text,
  session_id_hash text,
  login_at timestamptz,
  logout_at timestamptz,
  session_duration_seconds integer check (session_duration_seconds is null or session_duration_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists login_activities_user_id_idx on public.login_activities (user_id, created_at desc);
create index if not exists login_activities_email_idx on public.login_activities (email, created_at desc);
create index if not exists login_activities_role_idx on public.login_activities (role, created_at desc);
create index if not exists login_activities_event_type_idx on public.login_activities (event_type, created_at desc);
create index if not exists login_activities_status_idx on public.login_activities (status, created_at desc);
create index if not exists login_activities_created_at_idx on public.login_activities (created_at desc);
create index if not exists login_activities_login_at_idx on public.login_activities (login_at desc);

alter table public.login_activities enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'login_activities_read_own_or_admin' AND n.nspname = 'public' AND c.relname = 'login_activities'
  ) THEN
    CREATE POLICY "login_activities_read_own_or_admin"
      ON public.login_activities FOR SELECT
      USING (user_id = auth.uid() or public.is_super_admin());
  END IF;
END
$$;

-- There are deliberately no client insert, update, or delete policies.
-- The server-side service-role recorder is the only write path.

create table if not exists public.security_monitoring_settings (
  id boolean primary key default true check (id),
  retention_days integer not null default 365 check (retention_days between 30 and 3650),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.security_monitoring_settings (id) values (true)
on conflict (id) do nothing;

alter table public.security_monitoring_settings enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policy where polname = 'security_monitoring_settings_read_admin'
  ) then
    create policy "security_monitoring_settings_read_admin"
      on public.security_monitoring_settings for select using (public.is_super_admin());
  end if;

  if not exists (
    select 1 from pg_policy where polname = 'security_monitoring_settings_write_admin'
  ) then
    create policy "security_monitoring_settings_write_admin"
      on public.security_monitoring_settings for all using (public.is_super_admin()) with check (public.is_super_admin());
  end if;
end $$;

-- The legacy table is retained for compatibility with existing cookies, but it
-- must no longer be writable directly by browser sessions.
drop policy if exists "login_audit_insert_own" on public.login_audit;
drop policy if exists "login_audit_update_own" on public.login_audit;

insert into public.role_page_access (role, page_key)
values ('super_admin', 'login_activity')
on conflict (role, page_key) do nothing;
