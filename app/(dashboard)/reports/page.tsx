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
    </div>
  );
}
