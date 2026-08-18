import Link from "next/link";
import { LeavingStudentsFilters } from "./leaving-students-filters";
import { ExportLeavingStudentsButtons } from "./export-leaving-students-buttons";
import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { getLeavingRequests, getLeavingStudentsAnalytics } from "@/lib/leaving-students-service";
import {
  LEAVING_REASON_LABELS,
  LEAVING_STATUS_LABELS,
  LeavingReason,
  LeavingRequestStatus,
} from "@/lib/leaving-students";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === "string" ? value : undefined;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeVariant(status: LeavingRequestStatus) {
  switch (status) {
    case "approved":
    case "student_left":
      return "default";
    case "tc_generated":
      return "secondary";
    case "verification_pending":
    case "leaving_requested":
      return "outline";
    case "rejected":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function LeavingStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    await requirePageAccess("leaving_students");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch filter dropdown options
  const [{ data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("sections").select("id, name").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  const rawPage = Number(valueOf(searchParams, "page") ?? "1");
  const rawPerPage = Number(valueOf(searchParams, "perPage") ?? "10");

  const filters = {
    query: valueOf(searchParams, "q"),
    classId: valueOf(searchParams, "classId"),
    sectionId: valueOf(searchParams, "sectionId"),
    sessionId: valueOf(searchParams, "sessionId"),
    status: valueOf(searchParams, "status") as LeavingRequestStatus | "",
    clearanceStatus: valueOf(searchParams, "clearanceStatus") as "cleared" | "pending" | "",
    reason: valueOf(searchParams, "reason") as LeavingReason | "",
    fromDate: valueOf(searchParams, "fromDate"),
    toDate: valueOf(searchParams, "toDate"),
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    perPage: [10, 25, 50].includes(rawPerPage) ? rawPerPage : 10,
  };

  const [{ requests, totalCount, page, perPage }, analytics] = await Promise.all([
    getLeavingRequests(filters),
    getLeavingStudentsAnalytics(filters.sessionId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  function pageHref(newPage: number) {
    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, val]) => {
      if (typeof val === "string" && val) query.set(key, val);
    });
    query.set("page", String(Math.min(Math.max(newPage, 1), totalPages)));
    return `/leaving-students?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header & Title Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-50 text-gold-700 font-bold">📜</span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-700 sm:text-3xl">Leaving Students</h1>
          </div>
          <p className="mt-1 text-sm text-slate/60">
            Manage transfer certificates, clearance verification, leaving approvals, and official departure workflow.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leaving-students/new">
            <Button variant="primary" className="gap-2 bg-ink-900 hover:bg-ink-800 text-gold-400 font-semibold shadow-xs">
              <span>+</span> Initiate Exit & Clearance
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Analytics KPI Cards - Styled like Active Users Report */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition duration-200 hover:border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-xs text-blue-700">📋</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">{analytics.counts.totalRequests}</p>
          <p className="mt-1 text-[11px] text-slate-500">All time exit applications</p>
        </div>

        {/* Pending Approval */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/30 p-4 transition duration-200 hover:border-amber-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Approval</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-xs text-amber-800">⏳</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-900">{analytics.counts.pendingApproval}</p>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">Awaiting admin sign-off</p>
        </div>

        {/* TC / Certificates Issued */}
        <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/30 p-4 transition duration-200 hover:border-indigo-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">TC Issued</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-xs text-indigo-800">🎓</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-indigo-900">{analytics.counts.certificatesGenerated}</p>
          <p className="mt-1 text-[11px] text-indigo-700">Certificates generated</p>
        </div>

        {/* Students Left (Completed) */}
        <div className="rounded-2xl border border-emerald-200/90 bg-white p-4 transition duration-200 hover:border-emerald-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Students Left</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-xs text-emerald-800">✓</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-900">{analytics.counts.studentsLeft}</p>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">Completed departure</p>
        </div>
      </div>

      {/* Search and Filters Form */}
      <LeavingStudentsFilters
        filters={filters}
        classes={classes ?? []}
        sections={sections ?? []}
        sessions={sessions ?? []}
        statusLabels={LEAVING_STATUS_LABELS}
        reasonLabels={LEAVING_REASON_LABELS}
        requests={requests ?? []}
      />

      {/* Main Container Card */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs p-0 overflow-hidden bg-white">
        {/* Mobile View: Responsive Card Grid (hidden on md and up) */}
        <div className="md:hidden space-y-3 p-3 bg-white border-b border-slate-200">
          {requests.length === 0 ? (
            <div className="py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-2xl">🔍</span>
              <p className="text-xs font-semibold text-slate-900 mt-1">No leaving student records found</p>
            </div>
          ) : (
            requests.map((r) => {
              const isCleared = r.overall_clearance_status === "cleared";
              return (
                <article
                  key={r.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 space-y-2.5"
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1.5 ${
                      r.status === "approved" || r.status === "student_left"
                        ? "bg-emerald-500"
                        : r.status === "tc_generated"
                        ? "bg-indigo-500"
                        : r.status === "rejected" || r.status === "cancelled"
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`}
                  />

                  <div className="pl-1 space-y-2">
                    {/* Header: Student Name + ADM & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{r.student_name}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          ADM: {r.admission_number} • {(r.classes as any)?.name} {(r.sections as any)?.name ? `- ${(r.sections as any).name}` : ""}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(r.status as LeavingRequestStatus)}>
                        {LEAVING_STATUS_LABELS[r.status as LeavingRequestStatus] || r.status}
                      </Badge>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium block">TC Number</span>
                        <span className="font-mono font-semibold text-slate-800 truncate block">
                          {r.certificate_number || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Clearance</span>
                        <span className={`font-semibold ${isCleared ? "text-emerald-700" : "text-amber-700"}`}>
                          {isCleared ? "✓ Cleared" : "⏳ Pending"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Leaving Date</span>
                        <span className="text-slate-700 font-medium block">{formatDate(r.leaving_date)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Reason</span>
                        <span className="text-slate-700 font-medium truncate block">
                          {LEAVING_REASON_LABELS[r.reason as LeavingReason] || r.reason}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                      <Link href={`/leaving-students/${r.id}`}>
                        <Button size="sm" variant="outline" className="text-xs py-1 px-3">
                          Manage Request →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Desktop Responsive Table (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 font-mono text-xs uppercase tracking-wider text-slate/70">
              <tr>
                <th className="px-4 py-3.5">Cert No.</th>
                <th className="px-4 py-3.5">Admission No.</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Class / Sec</th>
                <th className="px-4 py-3.5">Leaving Date</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Workflow Status</th>
                <th className="px-4 py-3.5">Clearance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate/60">
                    No leaving student records found matching the criteria.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="transition hover:bg-ink-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-ink-700">
                      {r.certificate_number ? (
                        <span className="rounded bg-gold-50 px-1.5 py-0.5 font-bold text-gold-700">
                          {r.certificate_number}
                        </span>
                      ) : (
                        <span className="text-slate/40">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate/80">
                      {r.admission_number}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-800">{r.student_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate/70">
                      {(r.classes as any)?.name} {(r.sections as any)?.name ? `- ${(r.sections as any).name}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate/70">{formatDate(r.leaving_date)}</td>
                    <td className="max-w-[160rem] truncate px-4 py-3 text-slate/70">
                      {LEAVING_REASON_LABELS[r.reason as LeavingReason] || r.reason}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={statusBadgeVariant(r.status as LeavingRequestStatus)}>
                        {LEAVING_STATUS_LABELS[r.status as LeavingRequestStatus] || r.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.overall_clearance_status === "cleared" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          ✓ Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link href={`/leaving-students/${r.id}`}>
                        <Button size="sm" variant="outline">
                          Manage Request →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-xs">
            <p className="text-slate/60">
              Showing <span className="font-semibold text-ink-700">{(page - 1) * perPage + 1}</span> to{" "}
              <span className="font-semibold text-ink-700">{Math.min(page * perPage, totalCount)}</span> of{" "}
              <span className="font-semibold text-ink-700">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-2">
              <Link href={pageHref(page - 1)}>
                <Button size="sm" variant="outline" disabled={page <= 1}>
                  Previous
                </Button>
              </Link>
              <span className="font-medium text-ink-700">
                Page {page} of {totalPages}
              </span>
              <Link href={pageHref(page + 1)}>
                <Button size="sm" variant="outline" disabled={page >= totalPages}>
                  Next
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
