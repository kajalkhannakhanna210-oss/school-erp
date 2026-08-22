"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { ExportEnquiryButton } from "../export-enquiry-button";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_TYPES } from "@/lib/enquiries";

type ReportType = "enquiry" | "followup" | "staff" | "source" | "class" | "conversion";

const REPORT_TABS: { key: ReportType; label: string; description: string }[] = [
  { key: "enquiry", label: "1. Enquiry Report", description: "Detailed listing of enquiries filtered by date, class, staff & status" },
  { key: "followup", label: "2. Follow-up Report", description: "Log of all interaction touchpoints, notes & next scheduled dates" },
  { key: "staff", label: "3. Staff Performance", description: "Enquiry volume, in-progress count, won conversions & rate per staff member" },
  { key: "source", label: "4. Source Analysis", description: "Breakdown of enquiries & conversion rates across walk-ins, web, referrals, ads" },
  { key: "class", label: "5. Class-wise Report", description: "Distribution of enquiries and conversion success per target grade/class" },
  { key: "conversion", label: "6. Conversion Rate", description: "Stage-by-stage pipeline distribution (New → Won/Lost) & overall conversion" },
];

export function EnquiryReportsClient({
  reportType,
  reportData,
  classes,
  sessions,
  staffList,
}: {
  reportType: ReportType;
  reportData: Record<string, any>[];
  classes: { id: string; name: string }[];
  sessions: { id: string; name: string; is_current?: boolean }[];
  staffList: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [session, setSession] = useState(searchParams.get("session_id") ?? "");
  const [cls, setCls] = useState(searchParams.get("class_id") ?? "");
  const [type, setType] = useState(searchParams.get("enquiry_type") ?? "");
  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [staff, setStaff] = useState(searchParams.get("assigned_staff_id") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");

  const switchReport = (target: ReportType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("reportType", target);
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("reportType", reportType);
    if (session) params.set("session_id", session);
    if (cls) params.set("class_id", cls);
    if (type) params.set("enquiry_type", type);
    if (source) params.set("source", source);
    if (staff) params.set("assigned_staff_id", staff);
    if (status) params.set("status", status);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSession("");
    setCls("");
    setType("");
    setSource("");
    setStaff("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    router.push(`${pathname}?reportType=${reportType}`);
  };

  const activeTabInfo = REPORT_TABS.find((t) => t.key === reportType) ?? REPORT_TABS[0];
  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6">
      {/* 6 Report Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchReport(t.key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              reportType === t.key
                ? "border-gold-500 bg-white shadow-md ring-2 ring-gold-500/20"
                : "border-ink-100 bg-white/70 hover:bg-white hover:shadow-xs"
            }`}
          >
            <p className="font-display text-xs font-bold text-ink-700">{t.label}</p>
            <p className="mt-1 line-clamp-2 text-[10px] text-slate/60">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Filter Card */}
      <Card className="border-ink-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Session</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Class</label>
            <select
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Enquiry Mode</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Types</option>
              {ENQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Sources</option>
              {ENQUIRY_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Staff</label>
            <select
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Staff</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 bg-white px-2.5 text-xs"
            >
              <option value="">All Statuses</option>
              {ENQUIRY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate/60">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-ink-100 px-2.5 text-xs"
            />
          </div>

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
          <Button variant="ghost" onClick={clearFilters} className="h-8 px-3 text-xs">
            Clear
          </Button>
          <Button onClick={applyFilters} className="h-8 bg-ink-700 px-4 text-xs text-white hover:bg-ink-600">
            Apply Report Filters
          </Button>
        </div>
      </Card>

      {/* Report Data Card */}
      <Card className="border-ink-100 p-0 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-700">{activeTabInfo.label}</h2>
            <p className="text-xs text-slate/60">{reportData.length} records in generated report</p>
          </div>

          <ExportEnquiryButton rows={reportData} filenamePrefix={`enquiry-report-${reportType}`} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/30 text-left text-xs font-bold uppercase tracking-wider text-slate/60">
                <th className="px-4 py-3">#</th>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} className="border-b border-ink-100 transition hover:bg-gold-50/20 last:border-0">
                  <td className="px-4 py-3 text-xs text-slate/50">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-ink-700">
                      {row[col] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center text-xs text-slate/50">
                    No data matching active report filters.
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
