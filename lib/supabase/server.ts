
export async function createClient() {
  // Lazy-import to avoid bundling next/headers into contexts where it's not available
  const { createServerClient } = await import("@supabase/ssr");
  let cookieStore: any;
  try {
    const headers = await import("next/headers");
    cookieStore = await headers.cookies();
  } catch (e) {
    throw new Error("createClient must be called from a Next.js Server Component where next/headers is available");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: {
              path?: string;
              domain?: string;
              maxAge?: number;
              expires?: Date;
              httpOnly?: boolean;
              secure?: boolean;
              sameSite?: "lax" | "strict" | "none";
            };
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render.
            // Middleware refreshes the session on the next request.
          }
        },
      },
    }
  );
}