import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { hasReportsAccess } from "@/lib/require-role";
import { getReport, REPORT_TYPES, type ReportType } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { ReportFilters } from "./report-filters";

const TAB_LABELS: Record<ReportType, string> = {
  collection: "Collection",
  "pending-fees": "Pending Fees",
  concessions: "Concessions",
  "late-fees": "Late Fees",
  attendance: "Attendance",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { type?: string; [key: string]: string | undefined };
}) {
  const allowed = await hasReportsAccess();
  if (!allowed) redirect("/dashboard");

  const type = (REPORT_TYPES.includes(searchParams.type as ReportType) ? searchParams.type : "collection") as ReportType;

  const supabase = await createClient();
  const [{ data: classes }, { data: sections }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
  ]);

  const filters = Object.fromEntries(
    Object.entries(searchParams).filter(([k]) => k !== "type") as [string, string][]
  );
  const result = await getReport(supabase, type, filters);
  let loginActivity: { id: string; user_id: string; login_identifier: string; device_id: string; login_at: string; logout_at: string | null }[] = [];
  let profileNames = new Map<string, string>();
  if ((await supabase.from("profiles").select("role").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single()).data?.role === "super_admin") {
    const [{ data: auditRows }, { data: profileRows }] = await Promise.all([
      supabase.from("login_audit").select("id, user_id, login_identifier, device_id, login_at, logout_at").order("login_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, full_name"),
    ]);
    loginActivity = auditRows ?? [];
    profileNames = new Map((profileRows ?? []).map((profile) => [profile.id, profile.full_name]));
  }

  const exportQuery = new URLSearchParams({ ...filters }).toString();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Reports</h1>
      <p className="mt-1 text-sm text-slate/60">
        Every report here queries through the same row-level security as the rest of the app — a class teacher only
        ever sees their own classes' data, regardless of what filters are picked.
      </p>

      <div className="mt-6 flex gap-2 border-b border-ink-100">
        {REPORT_TYPES.map((t) => (
          <Link
            key={t}
            href={`/reports?type=${t}`}
            className={`px-4 py-2 text-sm font-medium ${
              t === type ? "border-b-2 border-gold text-ink-700" : "text-slate/50"
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <ReportFilters type={type} classes={classes ?? []} sections={sections ?? []} />
        <div className="flex gap-2">
          <a href={`/api/reports/${type}?format=pdf&${exportQuery}`}>
            <Button variant="ghost">Export PDF</Button>
          </a>
          <a href={`/api/reports/${type}?format=excel&${exportQuery}`}>
            <Button variant="ghost">Export Excel</Button>
          </a>
        </div>
      </div>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                {result?.columns.map((c) => (
                  <th key={c.key} className={`py-2 pr-4 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result?.rows.map((row, i) => (
                <tr key={i} className="border-b border-ink-100 last:border-0">
                  {result.columns.map((c) => (
                    <td key={c.key} className={`py-2 pr-4 ${c.align === "right" ? "text-right font-mono" : ""}`}>
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {(!result || result.rows.length === 0) && (
                <tr>
                  <td colSpan={result?.columns.length ?? 1} className="py-8 text-center text-slate/50">
                    No data for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {(loginActivity.length > 0 || profileNames.size > 0) && <Card className="mt-8">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl text-ink-700">Login activity</h2><p className="text-sm text-slate/60">Recent sign-ins and sign-outs by user and device.</p></div><span className="text-xs text-slate/50">Last 200 records</span></div>
        {loginActivity.length === 0 ? <p className="py-8 text-center text-sm text-slate/60">No login activity has been recorded yet. Sign out and sign in again to create the first record.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50"><th className="py-2 pr-4">User</th><th className="py-2 pr-4">Login ID</th><th className="py-2 pr-4">Device ID</th><th className="py-2 pr-4">Login time</th><th className="py-2 pr-4">Logout time</th><th className="py-2">Status</th></tr></thead><tbody>{loginActivity.map((row) => <tr key={row.id} className="border-b border-ink-100 last:border-0"><td className="py-2 pr-4"><span className="font-medium text-ink-700">{profileNames.get(row.user_id) ?? "Unknown user"}</span><span className="block font-mono text-[10px] text-slate/50">{row.user_id}</span></td><td className="py-2 pr-4">{row.login_identifier}</td><td className="max-w-44 truncate py-2 pr-4 font-mono text-xs" title={row.device_id}>{row.device_id}</td><td className="whitespace-nowrap py-2 pr-4">{new Date(row.login_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td className="whitespace-nowrap py-2 pr-4">{row.logout_at ? new Date(row.logout_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td><td className={row.logout_at ? "py-2 text-slate/60" : "py-2 font-semibold text-success"}>{row.logout_at ? "Logged out" : "Active"}</td></tr>)}</tbody></table></div>}
      </Card>}
    </div>
  );
}
