"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export type LoginRow = {
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

type Props = {
  rows: LoginRow[];
};

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function LoginActivityTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<LoginRow | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesQuery = !normalizedQuery || [row.user_name, row.email, row.user_id, row.ip_address, row.browser, row.device_type]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
    const matchesStatus = status === "all" || row.status === status;
    const matchesRole = role === "all" || row.role === role;
    const matchesEvent = eventType === "all" || row.event_type === eventType;
    const loginDate = (row.login_at ?? row.created_at).slice(0, 10);
    const matchesFrom = !from || loginDate >= from;
    const matchesTo = !to || loginDate <= to;
    return matchesQuery && matchesStatus && matchesRole && matchesEvent && matchesFrom && matchesTo;
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const totalUsers = new Set(rows.map((row) => row.user_id).filter(Boolean)).size;
  const activeUsers = new Set(rows.filter((row) => row.event_type === "successful_login" && !row.logout_at).map((row) => row.user_id).filter(Boolean)).size;
  const summary = [
    ["Total attempts", rows.length, "#1261e8"],
    ["Successful logins", rows.filter((row) => row.event_type === "successful_login").length, "#198754"],
    ["Failed logins", rows.filter((row) => row.status === "failed").length, "#dc3545"],
    ["Unique users", totalUsers, "#7c3aed"],
    ["Active users", activeUsers, "#0891b2"],
    ["Suspicious", rows.filter((row) => row.event_type === "suspicious_login_attempt").length, "#d97706"],
    ["New devices", rows.filter((row) => row.event_type === "new_device_login").length, "#475569"],
    ["Access denied", rows.filter((row) => row.event_type === "unauthorized_access_attempt" || row.event_type === "role_access_denied").length, "#be123c"],
  ] as const;

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setRole("all");
    setEventType("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function exportFile(format: "csv" | "excel" | "pdf") {
    const params = new URLSearchParams({ format, q: query, status, role, eventType, from, to });
    const response = await fetch(`/api/reports/login-activity?${params.toString()}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `login-activity-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 border-b border-transparent bg-gradient-to-r from-white/60 to-white p-4 sm:grid-cols-4 sm:px-6 xl:grid-cols-8">
        {summary.map(([label, value, color]) => (
          <div key={label} className="rounded-2xl bg-white/70 backdrop-blur-sm p-4 shadow-md border border-gray-100 flex flex-col">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="border-b border-[#d8e1ef] bg-[#f8fafc] px-5 py-4 sm:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row">
            <label className="relative block min-w-0 flex-1 md:max-w-sm">
              <span className="sr-only">Search login activity</span>
              <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user, email, or IP address" className="h-10 w-full rounded-lg border border-[#d8e1ef] bg-white pl-9 pr-3 text-sm text-[#0b2c61] outline-none transition placeholder:text-slate/50 focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10" />
            </label>
            <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-[#d8e1ef] bg-white px-3 text-sm text-[#0b2c61] outline-none focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10">
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
            <select aria-label="Filter by role" className="h-10 rounded-lg border border-[#d8e1ef] bg-white px-3 text-sm text-[#0b2c61] outline-none focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10" onChange={(event) => { setRole(event.target.value); setPage(1); }}>
              <option value="all">All roles</option><option value="super_admin">Admin</option><option value="staff">Teacher</option><option value="student">Student</option>
            </select>
            <select aria-label="Filter by event" className="h-10 rounded-lg border border-[#d8e1ef] bg-white px-3 text-sm text-[#0b2c61] outline-none focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10" onChange={(event) => { setEventType(event.target.value); setPage(1); }}>
              <option value="all">All events</option><option value="successful_login">Successful login</option><option value="failed_login">Failed login</option><option value="logout">Logout</option><option value="role_access_denied">Access denied</option><option value="rate_limit_exceeded">Rate limit exceeded</option>
            </select>
            <input aria-label="Filter from date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-[#d8e1ef] bg-white px-3 text-sm text-[#0b2c61] outline-none focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10" />
            <input aria-label="Filter to date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-[#d8e1ef] bg-white px-3 text-sm text-[#0b2c61] outline-none focus:border-[#1261e8] focus:ring-4 focus:ring-[#1261e8]/10" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate/60">{filteredRows.length} of {rows.length} records</span>
            <Button type="button" variant="ghost" onClick={resetFilters} className="min-h-10 border border-[#d8e1ef] bg-white px-3 text-xs">Reset</Button>
            <Button type="button" onClick={() => exportFile("csv")} className="min-h-10 gap-2 bg-[#1261e8] px-4 text-xs hover:bg-[#0b4fca]">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              CSV
            </Button>
            <Button type="button" variant="ghost" onClick={() => exportFile("excel")} className="min-h-10 border border-[#d8e1ef] bg-white px-3 text-xs">Excel</Button>
            <Button type="button" variant="ghost" onClick={() => exportFile("pdf")} className="min-h-10 border border-[#d8e1ef] bg-white px-3 text-xs">PDF</Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredRows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-slate/60">No login activity matches the selected filters.</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-3 px-4">
              {visibleRows.map((row) => (
                <article key={row.id} onClick={() => setSelectedRow(row)} className="bg-white rounded-xl p-4 shadow-sm border cursor-pointer">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{dateTime(row.created_at)}</div>
                      <div className="font-semibold text-[#0b2c61] truncate">{row.user_name ?? "Unknown user"}</div>
                      <div className="text-sm text-slate/500 truncate mt-1">{row.event_type.replaceAll("_", " ")} • {row.ip_address ?? "—"}</div>
                      <div className="text-xs text-slate/400 mt-2">{row.email ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className={row.status === "success" ? "text-[13px] font-semibold text-[#198754]" : "text-[13px] font-semibold text-[#b54708]"}>{row.status}</div>
                      <div className="text-sm font-medium mt-3">{row.session_duration_seconds == null ? "—" : `${Math.floor(row.session_duration_seconds / 60)}m ${row.session_duration_seconds % 60}s`}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop/table */}
            <div className="hidden md:block mt-2 overflow-x-auto">
              <table className="w-full min-w-[1450px] text-sm text-[#0b2c61]">
                <thead>
                  <tr className="border-b border-[#d8e1ef] text-left text-xs font-semibold uppercase tracking-wide text-slate/60">
                    <th className="px-8 py-5 pr-6">Date and time</th><th className="px-6 py-5">User</th><th className="px-6 py-5">Email</th><th className="px-6 py-5">Role</th><th className="px-6 py-5">Event type</th><th className="px-6 py-5">Status</th><th className="px-6 py-5">IP address</th><th className="px-6 py-5">Device</th><th className="px-6 py-5">Browser</th><th className="px-6 py-5">Login time</th><th className="px-6 py-5">Logout time</th><th className="px-6 py-5">Session</th><th className="px-6 py-5">Failure reason</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedRow(row)} className="cursor-pointer border-b border-[#d8e1ef] last:border-0 hover:bg-[#f8fafc]">
                      <td className="whitespace-nowrap px-8 py-4 pr-6">{dateTime(row.created_at)}</td>
                      <td className="px-6 py-4"><span className="block font-semibold text-[#0b2c61]">{row.user_name ?? "Unknown user"}</span><span className="mt-1 block font-mono text-[10px] text-slate/50">{row.user_id ?? "—"}</span></td>
                      <td className="px-6 py-4">{row.email ?? "—"}</td>
                      <td className="px-6 py-4 capitalize">{row.role === "super_admin" ? "Admin" : row.role === "staff" ? "Teacher" : row.role ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">{row.event_type.replaceAll("_", " ")}</td>
                      <td className={row.status === "success" ? "px-6 py-4 font-semibold text-[#198754]" : "px-6 py-4 font-semibold text-[#b54708]"}>{row.status}</td>
                      <td className="px-6 py-4 font-mono text-xs">{row.ip_address ?? "—"}</td>
                      <td className="px-6 py-4">{row.device_type ?? "—"}</td>
                      <td className="px-6 py-4">{row.browser ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">{dateTime(row.login_at)}</td>
                      <td className="whitespace-nowrap px-6 py-4">{dateTime(row.logout_at)}</td>
                      <td className="whitespace-nowrap px-6 py-4">{row.session_duration_seconds == null ? "—" : `${Math.floor(row.session_duration_seconds / 60)}m ${row.session_duration_seconds % 60}s`}</td>
                      <td className="px-6 py-4">{row.failure_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#d8e1ef] bg-[#f8fafc] px-5 py-3 text-xs text-slate/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}</span>
        <div className="flex items-center gap-2"><label htmlFor="login-rows">Rows</label><select id="login-rows" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border border-[#d8e1ef] bg-white px-2 py-1"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-[#d8e1ef] bg-white px-3 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded border border-[#d8e1ef] bg-white px-3 py-1 disabled:opacity-40">Next</button></div>
      </div>

      {selectedRow && <div role="dialog" aria-modal="true" aria-label="Activity details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelectedRow(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#1261e8]">Activity details</p><h2 className="mt-1 text-xl font-bold text-[#0b2c61]">{selectedRow.event_type.replaceAll("_", " ")}</h2></div><button type="button" onClick={() => setSelectedRow(null)} className="text-2xl leading-none text-slate/50" aria-label="Close details">×</button></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">{[["User", selectedRow.user_name ?? "Unknown user"], ["Email", selectedRow.email ?? "—"], ["Role", selectedRow.role ?? "—"], ["Status", selectedRow.status], ["Created", dateTime(selectedRow.created_at)], ["Login", dateTime(selectedRow.login_at)], ["Logout", dateTime(selectedRow.logout_at)], ["Session duration", selectedRow.session_duration_seconds == null ? "—" : `${Math.floor(selectedRow.session_duration_seconds / 60)}m ${selectedRow.session_duration_seconds % 60}s`], ["IP address", selectedRow.ip_address ?? "—"], ["Device", selectedRow.device_type ?? "—"], ["Browser", selectedRow.browser ?? "—"], ["Operating system", selectedRow.operating_system ?? "—"], ["Failure reason", selectedRow.failure_reason ?? "—"]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wide text-slate/50">{label}</dt><dd className="mt-1 break-words font-medium text-[#0b2c61]">{value}</dd></div>)}</dl></div></div>}
    </>
  );
}
