import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. This client uses the service role key and bypasses Row Level
// Security entirely — never import this file from a Client Component, and
// never prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
// Use it only for calls that genuinely require it (e.g. auth.admin.*); table
// reads/writes should still go through lib/supabase/server.ts so RLS applies.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
