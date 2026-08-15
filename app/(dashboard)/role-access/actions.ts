"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import type { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
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
