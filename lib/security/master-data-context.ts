import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLoginContext, type LoginScope } from "./login-context";

export type MasterSchool = { id: string; name: string; code: string; organization_id: string };
export type MasterOrganization = { id: string; name: string; code: string };

export async function getMasterDataContext() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { userId: null, role: null, organizationId: null, schoolId: null, loginScope: null, organizations: [] as MasterOrganization[], schools: [] as MasterSchool[] };

  const admin = createAdminClient();
  const [{ data: profile }, loginContext] = await Promise.all([
    admin.from("profiles").select("role, user_type").eq("id", auth.user.id).maybeSingle(),
    getLoginContext(),
  ]);
  const role = profile?.role ?? null;
  const { data: staff } = await admin.from("staff").select("organization_id").eq("id", auth.user.id).maybeSingle();
  const { data: memberships } = await admin.from("organization_memberships").select("organization_id, school_id").eq("profile_id", auth.user.id).eq("is_active", true);
  const { data: scopes } = await admin.from("staff_module_scopes").select("scope_type, resource_id").eq("staff_id", auth.user.id).eq("module_key", "school_access").eq("action_key", "ALL");

  const organizationId = loginContext?.organizationId ?? staff?.organization_id ?? memberships?.[0]?.organization_id ?? null;
  const allSchools = role === "super_admin" || (memberships ?? []).some((row) => row.school_id === null) || (scopes ?? []).some((row) => row.scope_type === "ALL");
  const allowedIds = new Set([...(memberships ?? []).map((row) => row.school_id), ...(scopes ?? []).filter((row) => row.scope_type === "SCHOOL").map((row) => row.resource_id)].filter(Boolean));
  const organizationsQuery = role === "super_admin" ? admin.from("organizations").select("id, name, code").eq("is_active", true).order("name") : null;
  const query = organizationId ? admin.from("schools").select("id, name, code, organization_id").eq("organization_id", organizationId).eq("is_active", true) : admin.from("schools").select("id, name, code, organization_id").eq("is_active", true);
  const { data: organizations } = organizationsQuery ? await organizationsQuery : { data: [] as MasterOrganization[] };
  const { data: schools } = await query.order("name");
  const visibleSchools = role === "super_admin" || allSchools ? schools ?? [] : (schools ?? []).filter((school) => allowedIds.has(school.id));
  const normalizedScope: LoginScope | null = role === "super_admin"
    ? "super_admin"
    : (profile as any)?.user_type === "ORGANISATION_USER" || role === "organization_admin"
      ? "organization"
      : loginContext?.loginScope ?? null;
  return { userId: auth.user.id, role, organizationId, schoolId: loginContext?.schoolId ?? null, loginScope: normalizedScope, organizations: (organizations ?? []) as MasterOrganization[], schools: visibleSchools as MasterSchool[] };
}

export async function validateMasterSchool(schoolId: string, organizationId?: string | null) {
  const context = await getMasterDataContext();
  const school = context.schools.find((item) => item.id === schoolId);
  if (!school || (organizationId && school.organization_id !== organizationId)) return { error: "Select an authorized school." };
  return { context, school };
}
