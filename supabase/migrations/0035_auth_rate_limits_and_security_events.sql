create table if not exists public.auth_rate_limits (
  key text primary key,
  action text not null,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  window_ends_at timestamptz not null,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists auth_rate_limits_action_updated_idx
  on public.auth_rate_limits (action, updated_at desc);

alter table public.auth_rate_limits enable row level security;

create table if not exists public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  identifier_hash text,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_security_events_created_idx
  on public.auth_security_events (created_at desc);
create index if not exists auth_security_events_type_created_idx
  on public.auth_security_events (event_type, created_at desc);

alter table public.auth_security_events enable row level security;

create policy "auth_security_events_read_admin"
  on public.auth_security_events for select
  using (public.is_super_admin());
