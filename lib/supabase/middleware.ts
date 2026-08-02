import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that must render without a session — the public website. Anything
// not listed here (and not /login, /forgot-password, or /api/*) requires
// auth, so a new dashboard route added later stays protected by default
// rather than needing to be added to an allowlist to become protected.
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
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/admin/login") || pathname.startsWith("/forgot-password");
  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // Public pages have anonymous read policies and don't need a session refresh.
  // Skipping this remote auth request makes the public site respond much faster.
  if (isPublicPage) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // API routes are never given an HTML redirect — a fetch/webhook caller
  // can't follow one usefully, and critically, external callers (Razorpay's
  // webhook servers, for one) will never carry our session cookie at all.
  // Each API route is responsible for its own auth response (RLS scoping
  // results to nothing for an anonymous caller, or an explicit 401/403),
  // exactly like /api/webhooks/razorpay and /api/reports/[type] already do.
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
