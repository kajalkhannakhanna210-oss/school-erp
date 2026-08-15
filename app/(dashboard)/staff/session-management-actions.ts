"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

export async function transferStaffSession(fromSessionId: string, toSessionId: string) {
  await requireSuperAdmin();
  if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) return { error: "Select two different sessions.", count: 0 };
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff_enrollments").select("staff_id, is_active").eq("session_id", fromSessionId);
  const rows = (staff ?? []).map((member) => ({ staff_id: member.staff_id, session_id: toSessionId, is_active: member.is_active }));
  if (rows.length) {
    const { error } = await supabase.from("staff_enrollments").upsert(rows, { onConflict: "staff_id,session_id" });
    if (error) return { error: error.message, count: 0 };
  }

  await recordServerAction({
    action: "Transfer Staff Session",
    module: "Staff",
    page: "Staff Session Assignment",
    resource: "/staff/session-management",
    outcome: `Transferred ${rows.length} staff enrollments to target session`,
  });

  revalidatePath("/staff");
  revalidatePath("/staff/session-management");
  return { error: null, count: rows.length };
}

