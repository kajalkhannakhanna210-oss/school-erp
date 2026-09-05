import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoginContext } from "./login-context";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await createAdminClient().from("profiles").select("id, full_name, role, role_id, user_type, platform_role, organization_id, school_id, is_active").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_active) return null;
  const userType = profile.user_type ?? (profile.role === "super_admin" ? "SUPER_ADMIN" : profile.school_id ? "SCHOOL_USER" : profile.organization_id ? "ORGANISATION_USER" : null);
  const admin = createAdminClient();
  const [{ data: rolePermissions }, { data: directPermissions }, { data: assignedRole }] = await Promise.all([
    profile.role_id ? admin.from("role_permissions").select("permission_key").eq("role_id", profile.role_id) : Promise.resolve({ data: [] as { permission_key: string }[] }),
    admin.from("staff_permissions").select("permission_key").eq("staff_id", auth.user.id),
    profile.role_id ? admin.from("staff_roles").select("id, role_code, role_name, role_scope").eq("id", profile.role_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const permissions = [...new Set([...(rolePermissions ?? []), ...(directPermissions ?? [])].map((item) => item.permission_key))];
  return { authUser: auth.user, profile, userType, assignedRole, permissions, loginContext: await getLoginContext() };
}

export async function requireSuperAdmin() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "SUPER_ADMIN" || (current.profile.platform_role && current.profile.platform_role !== "SUPER_ADMIN")) redirect("/superadmin/login");
  return current;
}

export async function requireOrganisationUser() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "ORGANISATION_USER" || current.loginContext?.loginScope !== "organization" || !current.loginContext.organizationId) redirect("/organisation/login");
  return { ...current, organisationId: current.loginContext.organizationId };
}

export async function requireSchoolUser() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "SCHOOL_USER" || !current.loginContext?.organizationId || !current.loginContext.schoolId) redirect("/login");
  return { ...current, organisationId: current.loginContext.organizationId, schoolId: current.loginContext.schoolId };
}

export const getCurrentOrganisation = async () => { const c = await getCurrentUser(); return c?.loginContext?.organizationId ?? c?.profile.organization_id ?? null; };
export const getCurrentSchool = async () => { const c = await getCurrentUser(); return c?.loginContext?.schoolId ?? c?.profile.school_id ?? null; };
export const validateOrganisationAccess = async (id: string) => { const c = await getCurrentUser(); return c?.userType === "SUPER_ADMIN" || c?.loginContext?.organizationId === id || c?.profile.organization_id === id; };
export const validateSchoolAccess = async (organisationId: string, schoolId: string) => { const c = await getCurrentUser(); return c?.userType === "SUPER_ADMIN" || (c?.loginContext?.organizationId === organisationId && c?.loginContext?.schoolId === schoolId) || (c?.profile.organization_id === organisationId && c?.profile.school_id === schoolId); };
export const logoutUser = async () => { const supabase = await createClient(); await supabase.auth.signOut(); };
