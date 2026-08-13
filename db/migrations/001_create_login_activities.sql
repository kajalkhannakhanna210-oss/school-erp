-- Migration: create login_activities table
-- Run this in Supabase/Postgres to add login activity tracking used by the app.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.login_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  email text,
  role text,
  event_type text,
  status text,
  ip_address text,
  browser text,
  operating_system text,
  device_type text,
  user_agent text,
  authentication_method text,
  failure_reason text,
  session_id_hash text,
  login_at timestamptz,
  logout_at timestamptz,
  session_duration_seconds integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_login_activities_user_id ON public.login_activities (user_id);
CREATE INDEX IF NOT EXISTS idx_login_activities_created_at ON public.login_activities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activities_event_type ON public.login_activities (event_type);

-- End of migration
