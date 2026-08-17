import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { LoginActivityTable } from "../login-activity-table";

export type LoginActivityRow = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  email: string | null;
  role: "super_admin" | "staff" | "student" | null;
  event_type: string;
  status: "success" | "failed" | "blocked";
  ip_address: string | null;
  browser: string | null;
  operating_system: string | null;
  device_type: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  login_at: string | null;
  logout_at: string | null;
  session_duration_seconds: number | null;
  created_at: string;
};

export default async function LoginActivityPage() {
  try {
    await requirePageAccess("login_activity");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("login_activities")
    .select("id, user_id, user_name, email, role, event_type, status, ip_address, browser, operating_system, device_type, user_agent, failure_reason, login_at, logout_at, session_duration_seconds, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (activity ?? []) as LoginActivityRow[];

  return (
    <div className="max-w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-700 sm:text-3xl">Login Activity</h1>
          <p className="mt-1 text-sm text-slate/60">Monitor account logins, security events, active sessions, and client devices.</p>
        </div>
        <a
          href="/reports/active-users"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <span>👥</span> Active Users Report &rarr;
        </a>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <LoginActivityTable rows={rows} />
      </div>
    </div>
  );
}
