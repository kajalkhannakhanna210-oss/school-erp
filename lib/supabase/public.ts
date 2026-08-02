import { createClient } from "@supabase/supabase-js";

// Public site content is covered by anonymous read policies. Avoid attaching
// session cookies here so these pages can be cached and do not wait on auth.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
