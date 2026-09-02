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
