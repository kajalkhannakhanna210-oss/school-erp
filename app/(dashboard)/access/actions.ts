"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/security/authorization";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveOrganisationPages(organisationId: string, enabledPageIds: string[]) {
  const user = await requireSuperAdmin();
  const admin = createAdminClient();
  const [{ data: pages }, { data: modules }] = await Promise.all([
    admin.from("system_pages").select("id, module_id").eq("is_active", true),
    admin.from("organisation_module_access").select("module_id").eq("organisation_id", organisationId).eq("is_enabled", true),
  ]);
  const enabledModules = new Set((modules ?? []).map((module) => module.module_id));
  const allowed = new Set((pages ?? []).filter((page) => page.module_id && enabledModules.has(page.module_id)).map((page) => page.id));
  if (enabledPageIds.some((id) => !allowed.has(id))) return { error: "A selected page belongs to a disabled module." };
  const selected = [...new Set(enabledPageIds)].filter((id) => allowed.has(id));
  const { error: deleteError } = await admin.from("organisation_page_access").delete().eq("organisation_id", organisationId);
  if (deleteError) return { error: deleteError.message };
  const { error } = await admin.from("organisation_page_access").insert((pages ?? []).map((page) => ({ organisation_id: organisationId, page_id: page.id, is_enabled: selected.includes(page.id), created_by: user.id, updated_by: user.id, updated_at: new Date().toISOString() })));
  if (error) return { error: error.message };
  revalidatePath("/access/organisations"); revalidatePath("/access/staff"); revalidatePath("/dashboard");
  return { error: null };
}

async function accessManager() {
  const current = await getCurrentUser();
  if (!current || (current.userType !== "SUPER_ADMIN" && !current.permissions.includes("settings.manage") && !current.permissions.includes("staff_page_access.manage"))) throw new Error("You are not authorized to manage page access.");
  return current;
}

export async function saveRolePages(organisationId: string, roleId: string, pageIds: string[]) {
  const current = await accessManager();
  const orgId = current.userType === "SUPER_ADMIN" ? organisationId : current.profile.organization_id;
  if (!orgId) return { error: "No organisation context is available." };
  const admin = createAdminClient();
  const { data: enabled } = await admin.from("organisation_page_access").select("page_id").eq("organisation_id", orgId).eq("is_enabled", true);
  const enabledSet = new Set((enabled ?? []).map((row) => row.page_id));
  const selected = [...new Set(pageIds)].filter((id) => enabledSet.has(id));
  if (selected.length !== [...new Set(pageIds)].length) return { error: "One or more pages are not enabled for this organisation." };
  await admin.from("role_page_assignments").delete().eq("organisation_id", orgId).eq("role_id", roleId);
  const { error } = selected.length ? await admin.from("role_page_assignments").insert(selected.map((page_id) => ({ organisation_id: orgId, role_id: roleId, page_id, is_enabled: true }))) : { error: null };
  if (error) return { error: error.message };
  revalidatePath("/access/staff"); revalidatePath("/dashboard");
  return { error: null };
}

export async function saveStaffPages(organisationId: string, staffUserId: string, schoolId: string | null, pageIds: string[]) {
  const current = await accessManager();
  const orgId = current.userType === "SUPER_ADMIN" ? organisationId : current.profile.organization_id;
  if (!orgId) return { error: "No organisation context is available." };
  const admin = createAdminClient();
  const [{ data: member }, { data: enabled }] = await Promise.all([
    admin.from("profiles").select("id, organization_id, school_id, user_type").eq("id", staffUserId).maybeSingle(),
    admin.from("organisation_page_access").select("page_id").eq("organisation_id", orgId).eq("is_enabled", true),
  ]);
  if (!member || member.organization_id !== orgId) return { error: "Staff member does not belong to this organisation." };
  if (member.user_type === "SCHOOL_USER" && member.school_id !== schoolId) return { error: "School staff access must use the assigned school." };
  const requested = [...new Set(pageIds)];
  const enabledSet = new Set((enabled ?? []).map((row) => row.page_id));
  if (requested.some((id) => !enabledSet.has(id))) return { error: "One or more pages are not enabled for this organisation." };
  let query = admin.from("staff_page_access").delete().eq("organisation_id", orgId).eq("staff_user_id", staffUserId);
  query = schoolId ? query.eq("school_id", schoolId) : query.is("school_id", null);
  const { error: deleteError } = await query;
  if (deleteError) return { error: deleteError.message };
  if (requested.length) {
    const { error } = await admin.from("staff_page_access").insert(requested.map((page_id) => ({ organisation_id: orgId, school_id: schoolId, staff_user_id: staffUserId, page_id, is_enabled: true, changed_by: current.authUser.id })));
    if (error) return { error: error.message };
  }
  revalidatePath("/access/staff"); revalidatePath("/dashboard");
  return { error: null };
}
