import { createPublicClient, withPublicDataTimeout } from "@/lib/supabase/public";
import type { Organization, School } from "./types";
import type { SchoolWebsite } from "@/lib/website/types";
import { resolveTenantFromRequest } from "@/lib/website/tenant-resolver";

export type CurrentSchoolWebsite = { organization: Organization; school: School; website: SchoolWebsite };

export async function getCurrentSchoolWebsite(): Promise<CurrentSchoolWebsite | null> {
  try {
    const supabase = createPublicClient();
    const emptyResponse = { data: null, error: null, count: null, status: 200, statusText: "OK", success: true as const };
    const tenant = await resolveTenantFromRequest();
    if (!tenant) return null;
    const schoolQuery = supabase.from("schools").select("id, organization_id, code, slug, name, organizations(id, code, name)").eq("id", tenant.schoolId).maybeSingle();
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
