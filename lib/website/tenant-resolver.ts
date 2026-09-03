import { headers } from "next/headers";
import { createPublicClient, withPublicDataTimeout } from "@/lib/supabase/public";
import { TENANT_PATH_HEADER, TENANT_PREFIX_HEADER, VERCEL_APP_HOST, cleanHostname, firstPathSegment, getTenantPrefixFromRequest } from "./tenant-path";
export { TENANT_PREFIX_COOKIE, TENANT_PATH_HEADER, TENANT_PREFIX_HEADER, VERCEL_APP_HOST } from "./tenant-path";

export type TenantResolution = {
  schoolId: string;
  organizationId: string;
  slug: string | null;
  source: "hostname" | "path" | "default";
};

export { firstPathSegment, getTenantPrefixFromRequest, stripTenantPrefix, withTenantPrefix } from "./tenant-path";

export async function resolveTenantFromRequest(input?: { hostname?: string; pathname?: string; prefix?: string | null }): Promise<TenantResolution | null> {
  const requestHeaders = headers();
  const hostname = cleanHostname(input?.hostname ?? requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "");
  const pathname = input?.pathname ?? requestHeaders.get(TENANT_PATH_HEADER) ?? "/";
  const prefix = input?.prefix === undefined
    ? requestHeaders.get(TENANT_PREFIX_HEADER) ?? getTenantPrefixFromRequest(pathname, hostname)
    : input.prefix;
  const client = createPublicClient();
  const empty = { data: null, error: null, count: null, status: 200, statusText: "OK", success: true as const };

  try {
    if (prefix) {
      const bySlug = await withPublicDataTimeout(
        client.from("schools").select("id, organization_id, slug").eq("slug", prefix).eq("is_active", true).maybeSingle(),
        empty
      );
      if (bySlug.data) {
        return { schoolId: bySlug.data.id, organizationId: bySlug.data.organization_id, slug: bySlug.data.slug, source: hostname.endsWith(".localhost") ? "hostname" : "path" };
      }
    }

    const byDomain = await withPublicDataTimeout(
      client.from("school_domains").select("school_id, organization_id").eq("domain", hostname).eq("is_active", true).maybeSingle(),
      empty
    );
    if (byDomain.data) return { schoolId: byDomain.data.school_id, organizationId: byDomain.data.organization_id, slug: null, source: "hostname" };

    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === VERCEL_APP_HOST) {
      const defaultSchool = await withPublicDataTimeout(
        client.from("schools").select("id, organization_id, slug").eq("is_default", true).eq("is_active", true).maybeSingle(),
        empty
      );
      if (defaultSchool.data) return { schoolId: defaultSchool.data.id, organizationId: defaultSchool.data.organization_id, slug: defaultSchool.data.slug, source: "default" };
    }
  } catch {
    return null;
  }
  return null;
}

export async function getRequestTenantPrefix() {
  const requestHeaders = headers();
  return requestHeaders.get(TENANT_PREFIX_HEADER) ?? getTenantPrefixFromRequest(
    requestHeaders.get(TENANT_PATH_HEADER) ?? "/",
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  );
}
