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
  "leaving-students": "Leaving Students",
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
  let loginActivity: {
    id: string;
    user_id: string | null;
    user_name: string | null;
    email: string | null;
    role: string | null;
    event_type: string;
    status: string;
    ip_address: string | null;
    device_type: string | null;
    browser: string | null;
    login_at: string | null;
    logout_at: string | null;
    created_at: string;
  }[] = [];
  if ((await supabase.from("profiles").select("role").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single()).data?.role === "super_admin") {
    const { data: activityRows } = await supabase
      .from("login_activities")
      .select("id, user_id, user_name, email, role, event_type, status, ip_address, device_type, browser, login_at, logout_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    loginActivity = (activityRows ?? []) as typeof loginActivity;
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
      {loginActivity.length > 0 && (
        <Card className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-ink-700">Login Activity</h2>
              <p className="text-sm text-slate/60">Recent account sign-ins, IP addresses, and device security logs.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate/50">Latest {loginActivity.length} events</span>
              <Link href="/reports/login-activity">
                <Button variant="ghost" className="text-xs text-[#222F57]">
                  Open Full Activity &rarr;
                </Button>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base text-slate-800">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs sm:text-sm uppercase tracking-wider text-slate-600 font-bold">
                  <th className="py-3.5 pr-4">User</th>
                  <th className="py-3.5 pr-4">Event</th>
                  <th className="py-3.5 pr-4">Status</th>
                  <th className="py-3.5 pr-4 font-mono">IP Address</th>
                  <th className="py-3.5 pr-4">Device / Browser</th>
                  <th className="py-3.5 pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loginActivity.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 pr-4">
                      <span className="font-extrabold text-slate-950 block text-base">{row.user_name ?? row.email ?? "Unknown"}</span>
                      {row.email && row.user_name && (
                        <span className="text-sm text-slate-500 block font-normal">{row.email}</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 text-base">
                      {row.event_type.replaceAll("_", " ")}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-extrabold capitalize ${
                          row.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : row.status === "blocked"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-sm text-slate-700 font-medium">{row.ip_address ?? "—"}</td>
                    <td className="py-3.5 pr-4 text-base text-slate-700 font-medium">
                      {row.device_type ? `${row.device_type} • ` : ""}
                      {row.browser ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-sm text-slate-600 whitespace-nowrap font-medium">
                      {new Date(row.login_at ?? row.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
