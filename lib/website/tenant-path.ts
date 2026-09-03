export const TENANT_PREFIX_COOKIE = "school_tenant_prefix";
export const TENANT_PREFIX_HEADER = "x-school-tenant-prefix";
export const TENANT_PATH_HEADER = "x-school-request-path";
export const VERCEL_APP_HOST = "school-erp-connect.vercel.app";
export const RESERVED_TENANT_PATHS = new Set(["api", "_next", "superadmin", "admin", "organisation", "org", "login", "logout", "favicon.ico", "images", "assets", "dashboard", "school-master", "organization-master", "master", "academic", "students", "staff", "attendance", "exams", "fees", "payments", "reports", "documents", "cms", "profile", "role-access", "admissions", "admissions-admin", "enquiries", "leaving-students", "select-school", "forgot-password"]);

export function cleanHostname(hostname: string) { return hostname.split(":")[0].toLowerCase().trim(); }
export function firstPathSegment(pathname: string) {
  const segment = pathname.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
  return segment && !RESERVED_TENANT_PATHS.has(segment) && !segment.includes(".") ? segment : null;
}
export function getTenantPrefixFromRequest(pathname: string, hostname: string) {
  const host = cleanHostname(hostname);
  if (host.endsWith(".localhost")) return host.slice(0, -".localhost".length) || null;
  if (host === VERCEL_APP_HOST) return firstPathSegment(pathname);
  return null;
}
export function stripTenantPrefix(pathname: string, prefix: string | null) {
  if (!prefix) return pathname || "/";
  if (pathname === `/${prefix}`) return "/";
  if (pathname.startsWith(`/${prefix}/`)) return pathname.slice(prefix.length + 1) || "/";
  return pathname || "/";
}
export function withTenantPrefix(pathname: string, currentPathname: string) {
  const prefix = firstPathSegment(currentPathname);
  if (!prefix || pathname === "/" || pathname.startsWith(`/${prefix}/`) || pathname === `/${prefix}`) return pathname;
  return `/${prefix}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function isValidSchoolSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_TENANT_PATHS.has(slug);
}
