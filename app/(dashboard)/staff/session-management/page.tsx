import { createClient } from "@/lib/supabase/server";
import { StaffSessionManagementForm } from "../session-management-form";

export default async function StaffSessionManagementPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false });
  const { data: enrollments } = await supabase.from("staff_enrollments").select("session_id");
  const counts = (enrollments ?? []).reduce<Record<string, number>>((map, row) => { map[row.session_id] = (map[row.session_id] ?? 0) + 1; return map; }, {});
  return <div><h1 className="font-display text-2xl text-ink-700">Staff Session Management</h1><p className="mt-1 text-sm text-slate/60">Transfer staff enrollment to a new session without removing previous history.</p><div className="mt-6"><StaffSessionManagementForm sessions={sessions ?? []} sessionCounts={counts} /></div></div>;
}
