import { headers } from "next/headers";
import { createPublicClient, withPublicDataTimeout } from "@/lib/supabase/public";
import type { Organization, School } from "./types";
import type { SchoolWebsite } from "@/lib/website/types";

export type CurrentSchoolWebsite = { organization: Organization; school: School; website: SchoolWebsite };

function hostnameFromHeaders() {
  const requestHeaders = headers();
  return (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").split(":")[0].toLowerCase();
}

export async function getCurrentSchoolWebsite(): Promise<CurrentSchoolWebsite | null> {
  try {
    const supabase = createPublicClient();
    const hostname = hostnameFromHeaders();
    const emptyResponse = { data: null, error: null, count: null, status: 200, statusText: "OK", success: true as const };
    const domainResult = hostname
      ? await withPublicDataTimeout(supabase.from("school_domains").select("school_id").eq("domain", hostname).eq("is_active", true).maybeSingle(), emptyResponse)
      : { data: null };
    const schoolId = domainResult.data?.school_id;
    const schoolQuery = schoolId
      ? supabase.from("schools").select("id, organization_id, code, slug, name, organizations(id, code, name)").eq("id", schoolId).maybeSingle()
      : supabase.from("schools").select("id, organization_id, code, slug, name, organizations(id, code, name)").eq("is_default", true).maybeSingle();
    const schoolResult = await withPublicDataTimeout(schoolQuery, emptyResponse);
    if (!schoolResult.data) return null;
    const row = schoolResult.data as School & { organizations: Organization | Organization[] | null };
    const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!organization) return null;
    const websiteResult = await withPublicDataTimeout(
      supabase.from("school_websites").select("*").eq("school_id", row.id).eq("status", "active").maybeSingle(),
      emptyResponse
    );
    if (!websiteResult.data) return null;
    const { organizations: _organizations, ...school } = row;
    return { organization, school, website: websiteResult.data as SchoolWebsite };
  } catch {
    // The resolver is deliberately optional during rollout; legacy public CMS
    // data remains available if the additive migration has not been applied.
    return null;
  }
}
