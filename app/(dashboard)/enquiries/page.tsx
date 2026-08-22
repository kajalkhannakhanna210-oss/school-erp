import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { getEnquiries, getEnquiryStats, getStaffOptions } from "@/lib/enquiries";
import { EnquiryFilters } from "./enquiry-filters";
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

  const page = Math.max(1, Number(searchParams.page ?? "1"));

  const [{ data: classes }, { data: sessions }, staffList, stats, { rows, total, totalPages }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    getStaffOptions(supabase),
    getEnquiryStats(supabase, searchParams.session_id),
    getEnquiries(supabase, { ...searchParams, page }),
  ]);

  const activeTab = searchParams.followup_due ?? (searchParams.status === "Won" ? "won" : "all");

  const buildTabHref = (due?: string, statusVal?: string) => {
    const p = { ...searchParams };
    delete p.page;
    if (due) p.followup_due = due as any;
    else delete p.followup_due;
    if (statusVal) p.status = statusVal;
    else if (!searchParams.status) delete p.status;
    const s = new URLSearchParams(p as any).toString();
    return `/enquiries${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate/60">
            <span className="font-semibold text-gold-700">Admissions</span>
            <span>/</span>
            <span className="font-semibold text-ink-700">Enquiry Management</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-700 sm:text-3xl">
            Admission Enquiry Directory
          </h1>
          <p className="mt-0.5 text-xs text-slate/60">
            Track prospective student inquiries, staff assignments, follow-up timelines & conversion funnel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/enquiries/reports">
            <button className="rounded-xl border border-ink-100 bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
              📊 Reports & Analytics
            </button>
          </Link>
          <Link href="/enquiries/new">
            <button className="rounded-xl bg-ink-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-ink-600">
              + Record New Enquiry
            </button>
          </Link>
        </div>
      </div>

      {/* 10 Dashboard Metric Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-5 lg:gap-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate/60">Total Enquiries</p>
          <p className="mt-1 font-display text-2xl font-black text-ink-900">{stats.total}</p>
          <p className="mt-0.5 text-[10px] text-slate/50">All registered inquiries</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">New</p>
          <p className="mt-1 font-display text-2xl font-black text-blue-900">{stats.newCount}</p>
          <p className="mt-0.5 text-[10px] text-blue-700/70">Unassigned / Recent</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Assigned</p>
          <p className="mt-1 font-display text-2xl font-black text-purple-900">{stats.assignedCount}</p>
          <p className="mt-0.5 text-[10px] text-purple-700/70">Staff assigned</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">In Follow-up</p>
          <p className="mt-1 font-display text-2xl font-black text-amber-900">{stats.followupCount}</p>
          <p className="mt-0.5 text-[10px] text-amber-700/70">Active touchpoints</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Interested</p>
          <p className="mt-1 font-display text-2xl font-black text-emerald-900">{stats.interestedCount}</p>
          <p className="mt-0.5 text-[10px] text-emerald-700/70">High prospect</p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-100/50 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-800">Won (Converted)</p>
          <p className="mt-1 font-display text-2xl font-black text-green-900">{stats.wonCount}</p>
          <p className="mt-0.5 text-[10px] text-green-800/70">Admitted students</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Lost / Closed</p>
          <p className="mt-1 font-display text-2xl font-black text-rose-900">{stats.lostCount + stats.closedCount}</p>
          <p className="mt-0.5 text-[10px] text-rose-700/70">Closed outcomes</p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Due Today</p>
          <p className="mt-1 font-display text-2xl font-black text-sky-900">{stats.todayFollowups}</p>
          <p className="mt-0.5 text-[10px] text-sky-700/70">Today&apos;s follow-ups</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Overdue</p>
          <p className="mt-1 font-display text-2xl font-black text-rose-950">{stats.overdueFollowups}</p>
          <p className="mt-0.5 text-[10px] text-rose-800/70">Past due follow-ups</p>
        </div>

        <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Conversion Rate</p>
          <p className="mt-1 font-display text-2xl font-black text-gold-900">{stats.conversionRate}%</p>
          <p className="mt-0.5 text-[10px] text-gold-700/70">Won / Total ratio</p>
        </div>
      </div>

      {/* Follow-up Dashboard Quick Tabs */}
      <div className="flex border-b border-ink-100 overflow-x-auto text-xs font-bold uppercase tracking-wider">
        <Link
          href={buildTabHref()}
          className={`border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
            activeTab === "all" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
          }`}
        >
          All Enquiries ({stats.total})
        </Link>

        <Link
          href={buildTabHref("today")}
          className={`border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
            activeTab === "today" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
          }`}
        >
          Due Today ({stats.todayFollowups})
        </Link>

        <Link
          href={buildTabHref("overdue")}
          className={`border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
            activeTab === "overdue" ? "border-rose-500 text-rose-700" : "border-transparent text-slate/60 hover:text-ink-700"
          }`}
        >
          Overdue ({stats.overdueFollowups})
        </Link>

        <Link
          href={buildTabHref("upcoming")}
          className={`border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
            activeTab === "upcoming" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
          }`}
        >
          Upcoming ({stats.upcomingFollowups})
        </Link>

        <Link
          href={buildTabHref(undefined, "Won")}
          className={`border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
            activeTab === "won" ? "border-green-600 text-green-800" : "border-transparent text-slate/60 hover:text-ink-700"
          }`}
        >
          Won / Converted ({stats.wonCount})
        </Link>
      </div>

      {/* Filters */}
      <EnquiryFilters classes={classes ?? []} sessions={sessions ?? []} staffList={staffList} />

      {/* Main List Table */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
        <EnquiriesListClient rows={rows} canManage={canManage} staffList={staffList} />
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
