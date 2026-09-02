import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPER_ADMIN_SESSION_COOKIE_NAME,
  getSuperAdminSessionSecret,
  superAdminSessionCookieOptions,
  validateSuperAdminSessionToken,
} from "@/lib/security/super-admin-session";

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

  // Public detail pages are dynamic, so they cannot be represented by the
  // exact-path set above. Keep them out of the auth refresh round-trip too.
  const isPublicPage =
    PUBLIC_PAGE_PATHS.has(pathname) ||
    pathname.startsWith("/gallery/") ||
    pathname.startsWith("/events/");
  const isApiRoute = pathname.startsWith("/api/");
  const isSignInRequest = pathname === "/api/auth/sign-in";

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

  // getUser validates the token with Supabase and also refreshes the session
  // cookies when needed. This prevents the dashboard from treating a freshly
  // authenticated browser as anonymous.
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  // Supabase refreshes sessions indefinitely by default. Super-admin access is
  // additionally bound to this signed, non-refreshable 24-hour session token.
  // Checking it in middleware means expired admin sessions cannot reach pages,
  // route handlers, or server actions.
  if (user && !isSignInRequest) {
    const [{ data: profile }, { data: superAdminMembership }] = await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("profile_roles")
        .select("role")
        .eq("profile_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle(),
    ]);
    const sessionToken = request.cookies.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
    const sessionStatus = await validateSuperAdminSessionToken(
      sessionToken,
      user.id,
      getSuperAdminSessionSecret()
    );
    const isOrWasSuperAdmin =
      profile?.role === "super_admin" ||
      Boolean(superAdminMembership) ||
      sessionStatus === "valid" ||
      sessionStatus === "expired";

    if (isOrWasSuperAdmin && sessionStatus !== "valid") {
      await supabase.auth.signOut();
      supabaseResponse.cookies.set(
        SUPER_ADMIN_SESSION_COOKIE_NAME,
        "",
        superAdminSessionCookieOptions(0)
      );

      if (isApiRoute) {
        const response = NextResponse.json({ error: "Your super-admin session has expired. Please sign in again." }, { status: 401 });
        supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        return response;
      }

      if (!isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        const response = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        return response;
      }
    }
  }

  // API routes should handle their own authentication
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
