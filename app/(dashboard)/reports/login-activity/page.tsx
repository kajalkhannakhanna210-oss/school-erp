import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function LoginActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") redirect("/reports");

  const [{ data: activity }, { data: profiles }] = await Promise.all([
    supabase.from("login_audit").select("id, user_id, login_identifier, device_id, login_at, logout_at").order("login_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
  const rows = activity ?? [];
  const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return <div><h1 className="font-display text-2xl text-ink-700">Login Activity</h1><p className="mt-1 text-sm text-slate/60">Track account sign-ins, devices, and sign-out times.</p><Card className="mt-6"><div className="overflow-x-auto">{rows.length === 0 ? <p className="py-10 text-center text-sm text-slate/60">No login activity recorded yet. Sign out and sign in again to create a record.</p> : <table className="w-full text-sm"><thead><tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50"><th className="py-3 pr-4">User</th><th className="py-3 pr-4">Login ID</th><th className="py-3 pr-4">Device ID</th><th className="py-3 pr-4">Login time</th><th className="py-3 pr-4">Logout time</th><th className="py-3">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-ink-100 last:border-0"><td className="py-3 pr-4"><span className="font-medium text-ink-700">{names.get(row.user_id) ?? "Unknown user"}</span><span className="block font-mono text-[10px] text-slate/50">{row.user_id}</span></td><td className="py-3 pr-4">{row.login_identifier}</td><td className="max-w-48 truncate py-3 pr-4 font-mono text-xs" title={row.device_id}>{row.device_id}</td><td className="whitespace-nowrap py-3 pr-4">{dateTime(row.login_at)}</td><td className="whitespace-nowrap py-3 pr-4">{dateTime(row.logout_at)}</td><td className={row.logout_at ? "py-3 text-slate/60" : "py-3 font-semibold text-success"}>{row.logout_at ? "Logged out" : "Active"}</td></tr>)}</tbody></table>}</div></Card></div>;
}
