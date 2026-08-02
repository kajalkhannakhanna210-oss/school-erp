import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that must render without a session — the public website.
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/about",
  "/principal-message",
  "/chairman-message",
  "/facilities",
  "/academics",
  "/admissions",
  "/fee-structure",
  "/alumni",
  "/gallery",
  "/events",
  "/notices",
  "/contact",
]);

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/forgot-password");

  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // Public pages do not require auth refresh
  if (isPublicPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // API routes should handle their own authentication
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  // Logged-in users should not see login pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}