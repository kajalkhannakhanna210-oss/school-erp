import { headers } from "next/headers";
import { createPublicClient, withPublicDataTimeout } from "@/lib/supabase/public";

export type LoginMode = "SUPER_ADMIN" | "ORGANISATION" | "SCHOOL";
export type TenantResolution = { loginMode: LoginMode; organisationId: string | null; schoolId: string | null; organisationName?: string | null; schoolName?: string | null };

export async function getTenantFromHostname(hostname?: string): Promise<TenantResolution | null> {
  const host = (hostname ?? headers().get("x-forwarded-host") ?? headers().get("host") ?? "").split(":")[0].toLowerCase().trim();
  if (!host) return null;
  const client = createPublicClient();
  const empty = { data: null, error: null, count: null, status: 200, statusText: "OK", success: true as const };
  const school = await withPublicDataTimeout(client.from("school_domains").select("school_id, organization_id, schools(name), organizations(name)").eq("domain", host).eq("is_active", true).maybeSingle(), empty);
  if (school.data) {
    const row = school.data as any;
    return { loginMode: "SCHOOL", organisationId: row.organization_id, schoolId: row.school_id, organisationName: row.organizations?.name ?? null, schoolName: row.schools?.name ?? null };
  }
  const organisation = await withPublicDataTimeout(client.from("organization_domains").select("organization_id, organizations(name)").eq("domain", host).eq("is_active", true).maybeSingle(), empty);
  if (organisation.data) return { loginMode: "ORGANISATION", organisationId: (organisation.data as any).organization_id, schoolId: null, organisationName: (organisation.data as any).organizations?.name ?? null };
  const label = host.split(".")[0];
  if (label && label !== "www" && label !== "localhost") {
    const fallback = await withPublicDataTimeout(client.from("organizations").select("id, name").eq("slug", label).eq("is_active", true).maybeSingle(), empty);
    if (fallback.data) return { loginMode: "ORGANISATION", organisationId: (fallback.data as any).id, schoolId: null, organisationName: (fallback.data as any).name ?? null };
  }
  if (host === "localhost" || host === "127.0.0.1") {
    const fallbackSchool = await withPublicDataTimeout(client.from("schools").select("id, organization_id, name, organizations(name)").eq("is_default", true).eq("is_active", true).maybeSingle(), empty);
    if (fallbackSchool.data) {
      const row = fallbackSchool.data as any;
      return { loginMode: "SCHOOL", organisationId: row.organization_id, schoolId: row.id, organisationName: row.organizations?.name ?? null, schoolName: row.name ?? null };
    }
  }
  return null;
}

export async function getOrganisationFromHostname(hostname?: string) { const tenant = await getTenantFromHostname(hostname); return tenant?.loginMode === "ORGANISATION" ? tenant : null; }
export async function getSchoolFromHostname(hostname?: string) { const tenant = await getTenantFromHostname(hostname); return tenant?.loginMode === "SCHOOL" ? tenant : null; }
