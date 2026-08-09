"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/staff");
  revalidatePath("/staff/session-management");
  return { error: null, count: rows.length };
}
