import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoginContext } from "./login-context";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await createAdminClient().from("profiles").select("id, full_name, role, user_type, platform_role, organization_id, school_id, is_active").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_active) return null;
  const userType = profile.user_type ?? (profile.role === "super_admin" ? "SUPER_ADMIN" : profile.school_id ? "SCHOOL_USER" : profile.organization_id ? "ORGANISATION_USER" : null);
  return { authUser: auth.user, profile, userType, loginContext: await getLoginContext() };
}

export async function requireSuperAdmin() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "SUPER_ADMIN" || (current.profile.platform_role && current.profile.platform_role !== "SUPER_ADMIN")) redirect("/superadmin/login");
  return current;
}

export async function requireOrganisationUser() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "ORGANISATION_USER" || !current.loginContext?.organizationId || current.loginContext.schoolId !== null) redirect("/organisation/login");
  return { ...current, organisationId: current.loginContext.organizationId };
}

export async function requireSchoolUser() {
  const current = await getCurrentUser();
  if (!current || current.userType !== "SCHOOL_USER" || !current.loginContext?.organizationId || !current.loginContext.schoolId) redirect("/login");
  return { ...current, organisationId: current.loginContext.organizationId, schoolId: current.loginContext.schoolId };
}

export const getCurrentOrganisation = async () => (await getCurrentUser())?.loginContext?.organizationId ?? null;
export const getCurrentSchool = async () => (await getCurrentUser())?.loginContext?.schoolId ?? null;
export const validateOrganisationAccess = async (id: string) => (await getCurrentUser())?.loginContext?.organizationId === id;
export const validateSchoolAccess = async (organisationId: string, schoolId: string) => { const c = await getCurrentUser(); return c?.loginContext?.organizationId === organisationId && c?.loginContext?.schoolId === schoolId; };
export const logoutUser = async () => { const supabase = await createClient(); await supabase.auth.signOut(); };
