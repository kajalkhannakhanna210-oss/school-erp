"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import type { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { navItems } from "../nav-config";
import { recordServerAction } from "@/lib/security/access-logs";

export async function updateRolePageAccess(role: UserRole, pageKeys: string[]) {
  await requireSuperAdmin();
  const allowedKeys = new Set(navItems.map((item) => item.key));
  const uniqueKeys = [...new Set(pageKeys)].filter((key) => allowedKeys.has(key));
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("role_page_access").delete().eq("role", role);
  if (deleteError) return { error: deleteError.message };

  if (uniqueKeys.length) {
    const defaultIcons: Record<string, string> = {
      dashboard: '⌂', master: '▦', sessions: '◷', classes: '▤', sections: '▥', class_teachers: '♙',
      students: '♟', add_student: '+', admission_allotment: '✓', staff: '♚', staff_sessions: '◷',
      documents: '▤', attendance: '◴', exams: '▣', fees: '₹',
      payments: '₹', reports: '▥', login_activity: '◷', access_logs: '📑', cms: '◆', admissions: '♜', role_access: '⚙', profile: '●'
    };

    const { error: insertError } = await supabase
      .from("role_page_access")
      .insert(uniqueKeys.map((page_key) => ({
        role,
        page_key,
        icon: navItems.find((i) => i.key === page_key)?.icon ?? defaultIcons[page_key] ?? '•',
      })));
    if (insertError) return { error: insertError.message };
  }

  await recordServerAction({
    action: "Update Role Page Permissions",
    module: "Settings",
    page: "Role Permissions",
    resource: "/role-access",
    outcome: `Updated permissions for ${role} (${uniqueKeys.length} pages enabled)`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/role-access");
  return { error: null };
}

export async function updateStaffSchoolScope(staffId: string, organizationId: string, schoolIds: string[], allAuthorizedSchools: boolean) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const [{ data: staff }, { data: schools }] = await Promise.all([
    admin.from("staff").select("id, organization_id").eq("id", staffId).maybeSingle(),
    admin.from("schools").select("id, organization_id").eq("organization_id", organizationId).eq("is_active", true),
  ]);
  if (!staff || staff.organization_id !== organizationId) return { error: "Staff member does not belong to the selected organization." };
  const authorizedSchoolIds = new Set((schools ?? []).map((school) => school.id));
  const selectedIds = [...new Set(schoolIds)].filter((id) => authorizedSchoolIds.has(id));
  if (!allAuthorizedSchools && selectedIds.length === 0) return { error: "Select at least one authorized school or choose all schools." };

  const { error: deleteError } = await admin.from("staff_module_scopes").delete().eq("staff_id", staffId).eq("module_key", "school_access");
  if (deleteError) return { error: deleteError.message };
  const rows: Array<{ staff_id: string; module_key: string; action_key: string; scope_type: string; resource_id: string | null }> = allAuthorizedSchools
    ? [{ staff_id: staffId, module_key: "school_access", action_key: "ALL", scope_type: "ALL", resource_id: null }]
    : selectedIds.map((schoolId) => ({ staff_id: staffId, module_key: "school_access", action_key: "ALL", scope_type: "SCHOOL", resource_id: schoolId }));
  const { error: insertError } = await admin.from("staff_module_scopes").insert(rows);
  if (insertError) return { error: insertError.message };
  revalidatePath("/role-access");
  return { error: null };
}

export async function assignStaffRole(staffId: string, roleId: string) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const [{ data: staff }, { data: role }] = await Promise.all([
    admin.from("staff").select("id, organization_id, primary_school_id").eq("id", staffId).maybeSingle(),
    admin.from("staff_roles").select("id, role_scope, is_active").eq("id", roleId).maybeSingle(),
  ]);
  if (!staff || !role || !role.is_active) return { error: "Select a valid active staff role." };
  if (role.role_scope === "ORGANISATION" && !staff.organization_id) return { error: "Organisation roles require an organisation assignment." };
  if (role.role_scope === "SCHOOL" && (!staff.organization_id || !staff.primary_school_id)) return { error: "School roles require an organisation and primary school assignment." };
  const userType = role.role_scope === "ORGANISATION" ? "ORGANISATION_USER" : "SCHOOL_USER";
  const { error } = await admin.from("profiles").update({ role_id: role.id, user_type: userType, organization_id: staff.organization_id, school_id: role.role_scope === "SCHOOL" ? staff.primary_school_id : null, updated_at: new Date().toISOString() }).eq("id", staffId);
  if (error) return { error: error.message };
  const { error: staffError } = await admin.from("staff").update({ role_id: role.id }).eq("id", staffId);
  if (staffError) return { error: staffError.message };
  await admin.from("user_roles").update({ is_primary: false, updated_at: new Date().toISOString() }).eq("user_id", staffId);
  const { error: assignmentError } = await admin.from("user_roles").upsert({
    user_id: staffId, role_id: role.id, organization_id: staff.organization_id,
    school_id: role.role_scope === "SCHOOL" ? staff.primary_school_id : null, is_primary: true, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,role_id,organization_id,school_id" });
  if (assignmentError) return { error: assignmentError.message };
  revalidatePath("/role-access");
  revalidatePath("/staff");
  return { error: null };
}
