import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { cleanHostname, firstPathSegment, getTenantPrefixFromRequest, stripTenantPrefix, TENANT_PATH_HEADER, TENANT_PREFIX_COOKIE, TENANT_PREFIX_HEADER, VERCEL_APP_HOST } from "@/lib/website/tenant-path";

async function isActiveSchoolSlug(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${url}/rest/v1/schools?select=id&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`, { headers: { apikey: key }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return false;
    const rows = await response.json() as unknown[];
    return rows.length > 0;
  } catch { return false; } finally { clearTimeout(timeout); }
}

export async function middleware(request: NextRequest) {
  const hostname = cleanHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");
  const pathname = request.nextUrl.pathname;
  const candidate = getTenantPrefixFromRequest(pathname, hostname);
  const cookiePrefix = request.cookies.get(TENANT_PREFIX_COOKIE)?.value ?? null;
  let prefix = candidate;

  if (hostname === VERCEL_APP_HOST && candidate && await isActiveSchoolSlug(candidate)) {
    const internalPath = stripTenantPrefix(pathname, candidate);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(TENANT_PREFIX_HEADER, candidate);
    requestHeaders.set(TENANT_PATH_HEADER, pathname);
    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = internalPath;
    const sessionRequest = new NextRequest(internalUrl, { headers: requestHeaders, method: request.method });
    const sessionResponse = await updateSession(sessionRequest);
    if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
      const location = sessionResponse.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location);
        if (redirectUrl.pathname.startsWith("/login")) redirectUrl.pathname = `/${candidate}${redirectUrl.pathname}`;
        const response = NextResponse.redirect(redirectUrl, sessionResponse.status);
        sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        response.cookies.set(TENANT_PREFIX_COOKIE, candidate, { httpOnly: false, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
        return response;
      }
    }
    const response = NextResponse.rewrite(new URL(internalPath, request.url), { request: { headers: requestHeaders } });
    sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    response.cookies.set(TENANT_PREFIX_COOKIE, candidate, { httpOnly: false, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
    return response;
  }

  if (hostname.endsWith(".localhost") && prefix) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(TENANT_PREFIX_HEADER, prefix);
    requestHeaders.set(TENANT_PATH_HEADER, pathname);
    const sessionRequest = new NextRequest(request.url, { headers: requestHeaders, method: request.method });
    return await updateSession(sessionRequest);
  }

  if (!candidate && cookiePrefix && pathname !== "/" && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.startsWith("/superadmin")) {
    const target = new URL(`/${cookiePrefix}${pathname}`, request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|m4a|aac|webm)$).*)"],
};
