import { createClient } from "@supabase/supabase-js";

export async function withPublicDataTimeout<T>(request: PromiseLike<T>, fallback: T, milliseconds = 1500): Promise<T> {
  return Promise.race([
    request,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), milliseconds)),
  ]);
}

// Public site content is covered by anonymous read policies. Avoid attaching
// session cookies here so these pages can be cached and do not wait on auth.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      // Public pages have safe fallback content. Avoid holding up the whole site
      // when the hosted content service is temporarily slow or unavailable.
      fetch: async (input, init) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        try {
          return await fetch(input, { ...init, signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  });
}
