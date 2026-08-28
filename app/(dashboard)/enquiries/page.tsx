import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { canAccessEnquiryAction, getEnquiries, getEnquiryActionPermissions, getEnquiryStats, getStaffOptions, getUserAdmissionScopes } from "@/lib/enquiries";
import { EnquiriesDirectoryControls } from "./enquiries-directory-controls";
import { EnquiriesNavigationLoader } from "./enquiries-navigation-loader";
import { EnquiriesListClient } from "./enquiries-list-client";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    session_id?: string;
    class_id?: string;
    enquiry_type?: string;
    source?: string;
    assigned_staff_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    followup_due?: "today" | "upcoming" | "overdue" | "none";
    page?: string;
  };
}) {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canManage = profile?.role === "super_admin" || profile?.role === "staff";
  const [canCreate, canReport, canExport] = await Promise.all([
    canAccessEnquiryAction(supabase, user!.id, "create"),
    canAccessEnquiryAction(supabase, user!.id, "report"),
    canAccessEnquiryAction(supabase, user!.id, "export"),
  ]);
  const viewScope = profile?.role === "super_admin"
    ? { all: true, classes: [] as string[] }
    : await getUserAdmissionScopes(supabase, user!.id);

  const tabFilter = (await cookies()).get("enquiries_tab_filter")?.value;
  const effectiveParams = { ...searchParams };
  if (!effectiveParams.followup_due && !effectiveParams.status && tabFilter && tabFilter !== "all") {
    if (tabFilter === "won") effectiveParams.status = "Won";
    else effectiveParams.followup_due = tabFilter as "today" | "overdue" | "upcoming";
  }
  const page = Math.max(1, Number(effectiveParams.page ?? "1"));
  const [{ data: classes }, { data: sessions }, staffList, stats, { rows, total, totalPages }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    getStaffOptions(supabase, undefined, profile?.role === "super_admin"),
    getEnquiryStats(supabase, effectiveParams.session_id, profile?.role === "super_admin"),
    getEnquiries(supabase, { ...effectiveParams, page, pageSize: 15 }, profile?.role === "super_admin"),
  ]);
  const actionPermissions = Object.fromEntries(
    await Promise.all((rows ?? []).map(async (row) => [row.id, await getEnquiryActionPermissions(supabase, row)] as const)),
  );
  const assignStaffByEnquiry = Object.fromEntries(
    await Promise.all(
      (rows ?? [])
        .filter((row) => actionPermissions[row.id]?.assign)
        .map(async (row) => [row.id, await getStaffOptions(supabase, row.class_id ?? undefined)] as const),
    ),
  );

  const activeTab = effectiveParams.followup_due ?? (effectiveParams.status === "Won" ? "won" : "all");
  const visibleClasses = viewScope.all
    ? (classes ?? [])
    : (classes ?? []).filter((item) => viewScope.classes.includes(item.id));

  const buildTabHref = (due?: string, statusVal?: string) => {
    const p = { ...effectiveParams };
    delete p.page;
    if (due) p.followup_due = due as any;
    else delete p.followup_due;
    if (statusVal) p.status = statusVal;
    else delete p.status;
    const s = new URLSearchParams(p as any).toString();
    return `/enquiries${s ? `?${s}` : ""}`;
  };

  return (
    <div className="min-w-0 space-y-4 pb-4">
      <EnquiriesNavigationLoader />
      {/* Top Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h1 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">
            Admission Enquiry Directory
          </h1>
          <p className="mt-0.5 text-xs text-slate/60">
            Manage leads, assignments, follow-ups, and conversions in one workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReport && <Link href="/enquiries/reports">
            <button className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
              Reports & Analytics
            </button>
          </Link>}
          {canCreate && <Link href="/enquiries/new">
            <button className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-ink-700">
              + New enquiry
            </button>
          </Link>}
        </div>
      </div>

      {/* 10 Dashboard Metric Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-5 lg:gap-3">
        <div className="rounded-xl border border-ink-100 border-l-4 border-l-ink-900 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate/60">Total Enquiries</p>
          <p className="mt-1 font-display text-2xl font-black text-ink-900">{stats.total}</p>
          <p className="mt-0.5 text-[10px] text-slate/50">All registered inquiries</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-blue-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">New</p>
          <p className="mt-1 font-display text-2xl font-black text-blue-900">{stats.newCount}</p>
          <p className="mt-0.5 text-[10px] text-blue-700/70">Unassigned / Recent</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-purple-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Assigned</p>
          <p className="mt-1 font-display text-2xl font-black text-purple-900">{stats.assignedCount}</p>
          <p className="mt-0.5 text-[10px] text-purple-700/70">Staff assigned</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-amber-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">In Follow-up</p>
          <p className="mt-1 font-display text-2xl font-black text-amber-900">{stats.followupCount}</p>
          <p className="mt-0.5 text-[10px] text-amber-700/70">Active touchpoints</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-emerald-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Interested</p>
          <p className="mt-1 font-display text-2xl font-black text-emerald-900">{stats.interestedCount}</p>
          <p className="mt-0.5 text-[10px] text-emerald-700/70">High prospect</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-green-600 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-800">Won (Converted)</p>
          <p className="mt-1 font-display text-2xl font-black text-green-900">{stats.wonCount}</p>
          <p className="mt-0.5 text-[10px] text-green-800/70">Admitted students</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-rose-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Lost / Closed</p>
          <p className="mt-1 font-display text-2xl font-black text-rose-900">{stats.lostCount + stats.closedCount}</p>
          <p className="mt-0.5 text-[10px] text-rose-700/70">Closed outcomes</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-sky-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Due Today</p>
          <p className="mt-1 font-display text-2xl font-black text-sky-900">{stats.todayFollowups}</p>
          <p className="mt-0.5 text-[10px] text-sky-700/70">Today&apos;s follow-ups</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-rose-700 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Overdue</p>
          <p className="mt-1 font-display text-2xl font-black text-rose-950">{stats.overdueFollowups}</p>
          <p className="mt-0.5 text-[10px] text-rose-800/70">Past due follow-ups</p>
        </div>

        <div className="rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Conversion Rate</p>
          <p className="mt-1 font-display text-2xl font-black text-gold-900">{stats.conversionRate}%</p>
          <p className="mt-0.5 text-[10px] text-gold-700/70">Won / Total ratio</p>
        </div>
      </div>

      {/* Follow-up Dashboard Quick Tabs and filters */}
      <EnquiriesDirectoryControls
        classes={visibleClasses}
        sessions={sessions ?? []}
        staffList={staffList}
        activeTab={activeTab}
        tabs={<div className="flex gap-1">
        <Link
          href={buildTabHref()}
          className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
            activeTab === "all" ? "bg-ink-900 text-white" : "bg-ink-50 text-slate/70 hover:bg-ink-100 hover:text-ink-700"
          }`}
        >
          All Enquiries ({stats.total})
        </Link>

        <Link
          href={buildTabHref("today")}
          className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
            activeTab === "today" ? "bg-ink-900 text-white" : "bg-ink-50 text-slate/70 hover:bg-ink-100 hover:text-ink-700"
          }`}
        >
          Due Today ({stats.todayFollowups})
        </Link>

        <Link
          href={buildTabHref("overdue")}
          className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
            activeTab === "overdue" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          Overdue ({stats.overdueFollowups})
        </Link>

        <Link
          href={buildTabHref("upcoming")}
          className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
            activeTab === "upcoming" ? "bg-ink-900 text-white" : "bg-ink-50 text-slate/70 hover:bg-ink-100 hover:text-ink-700"
          }`}
        >
          Upcoming ({stats.upcomingFollowups})
        </Link>

        <Link
          href={buildTabHref(undefined, "Won")}
          className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
            activeTab === "won" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          Won / Converted ({stats.wonCount})
        </Link>
        </div>}
      />

      {/* Main List Table */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
          <EnquiriesListClient rows={rows} total={total} canManage={canManage} canExport={canExport} staffList={staffList} assignStaffByEnquiry={assignStaffByEnquiry} activeTab={activeTab} actionPermissions={actionPermissions} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate/70">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams(searchParams as any);
            params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/enquiries?${params.toString()}`}
                className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
                  page === p
                    ? "border-gold-500 bg-gold-500 text-ink-900 font-bold"
                    : "border-ink-100 bg-white hover:bg-ink-50 text-ink-700"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
