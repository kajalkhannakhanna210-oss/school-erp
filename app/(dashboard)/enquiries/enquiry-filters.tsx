"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_TYPES } from "@/lib/enquiries";

export function EnquiryFilters({
  classes,
  sessions,
  staffList,
}: {
  classes: { id: string; name: string }[];
  sessions: { id: string; name: string; is_current?: boolean }[];
  staffList: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [session, setSession] = useState(searchParams.get("session_id") ?? "");
  const [cls, setCls] = useState(searchParams.get("class_id") ?? "");
  const [type, setType] = useState(searchParams.get("enquiry_type") ?? "");
  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [staff, setStaff] = useState(searchParams.get("assigned_staff_id") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [due, setDue] = useState(searchParams.get("followup_due") ?? "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [session, cls, type, source, staff, status, due, startDate, endDate]
    .filter(Boolean).length;

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (session) params.set("session_id", session);
    if (cls) params.set("class_id", cls);
    if (type) params.set("enquiry_type", type);
    if (source) params.set("source", source);
    if (staff) params.set("assigned_staff_id", staff);
    if (status) params.set("status", status);
    if (due) params.set("followup_due", due);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    setQ("");
    setSession("");
    setCls("");
    setType("");
    setSource("");
    setStaff("");
    setStatus("");
    setDue("");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-ink-800">Find enquiries</p>
          <p className="mt-0.5 text-[11px] text-slate/55">Search and narrow the directory.</p>
        </div>
        <button
          type="button"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((visible) => !visible)}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${showFilters || activeFilterCount ? "border-ink-900 bg-ink-900 text-white" : "border-ink-100 bg-white text-ink-700 hover:bg-ink-50"}`}
        >
          <span aria-hidden="true">☷</span>
          Filters
          {activeFilterCount > 0 && (
            <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] ${showFilters ? "bg-gold-400 text-ink-900" : "bg-ink-100 text-ink-700"}`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {/* Search */}
        <div className={showFilters ? "xl:col-span-2" : "sm:col-span-2 lg:col-span-3 xl:col-span-4"}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Search</label>
          <input
            type="text"
            placeholder="Name, ID, Parent, Mobile..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-3 text-xs"
          />
        </div>
      </div>
      {showFilters && <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {/* Academic Session */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Session</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_current ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Class Interested</label>
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Statuses</option>
            {ENQUIRY_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Follow-up Due */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Follow-up Due</label>
          <select
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Dates</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No Next Date</option>
          </select>
        </div>

        {/* Type (Online/Offline) */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Types</option>
            {ENQUIRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Sources</option>
            {ENQUIRY_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Staff */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Assigned Staff</label>
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs bg-white"
          >
            <option value="">All Staff</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-ink-100/60 pt-3">
        <Button type="button" variant="ghost" onClick={clearFilters} className="h-8 px-3 text-xs">
          Clear Filters
        </Button>
        <Button type="button" onClick={applyFilters} className="h-8 bg-ink-700 px-4 text-xs text-white hover:bg-ink-600">
          Apply Filters
        </Button>
      </div>
      </>}
    </div>
  );
}
