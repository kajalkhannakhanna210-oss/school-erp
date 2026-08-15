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
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function getEventIcon(eventType: string, status: string) {
  if (eventType === "logout") {
    return (
      <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    );
  }
  if (status === "failed" || eventType === "role_access_denied" || eventType === "unauthorized_access_attempt") {
    return (
      <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (status === "blocked" || eventType === "suspicious_login_attempt") {
    return (
      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFilterCount = [
    status !== "all",
    role !== "all",
    eventType !== "all",
    Boolean(from),
    Boolean(to),
  ].filter(Boolean).length;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      [row.user_name, row.email, row.user_id, row.ip_address, row.browser, row.device_type]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesStatus = status === "all" || row.status === status;
    const matchesRole = role === "all" || row.role === role;
    const matchesEvent =
      eventType === "all" ||
      row.event_type === eventType ||
      (eventType === "role_access_denied" &&
        (row.event_type === "role_access_denied" || row.event_type === "unauthorized_access_attempt"));
    const loginDate = (row.login_at ?? row.created_at).slice(0, 10);
    const matchesFrom = !from || loginDate >= from;
    const matchesTo = !to || loginDate <= to;
    return matchesQuery && matchesStatus && matchesRole && matchesEvent && matchesFrom && matchesTo;
  });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const totalUsers = new Set(rows.map((row) => row.user_id).filter(Boolean)).size;
  const activeUsers = new Set(
    rows.filter((row) => row.event_type === "successful_login" && !row.logout_at).map((row) => row.user_id).filter(Boolean)
  ).size;

  const summary = [
    { label: "Total Attempts", value: rows.length, color: "#2563eb", key: "total" },
    {
      label: "Successful",
      value: rows.filter((row) => row.event_type === "successful_login" || row.status === "success").length,
      color: "#16a34a",
      key: "success",
    },
    {
      label: "Failed",
      value: rows.filter((row) => row.status === "failed").length,
      color: "#e11d48",
      key: "failed",
    },
    { label: "Unique Users", value: totalUsers, color: "#9333ea", key: "unique" },
    { label: "Active Now", value: activeUsers, color: "#0891b2", key: "active" },
    {
      label: "Suspicious",
      value: rows.filter((row) => row.event_type === "suspicious_login_attempt").length,
      color: "#d97706",
      key: "suspicious",
    },
    {
      label: "New Devices",
      value: rows.filter((row) => row.event_type === "new_device_login").length,
      color: "#475569",
      key: "new_device",
    },
    {
      label: "Access Denied",
      value: rows.filter((row) => row.event_type === "unauthorized_access_attempt" || row.event_type === "role_access_denied").length,
      color: "#dc2626",
      key: "denied",
    },
  ];

  function applyCardFilter(key: string) {
    setPage(1);
    // If clicking the active filter, toggle it off back to all
    if (isStatActive(key) && key !== "total") {
      setStatus("all");
      setEventType("all");
      return;
    }

    switch (key) {
      case "total":
        setStatus("all");
        setEventType("all");
        setRole("all");
        setQuery("");
        setFrom("");
        setTo("");
        break;
      case "success":
        setStatus("success");
        setEventType("all");
        break;
      case "failed":
        setStatus("failed");
        setEventType("all");
        break;
      case "unique":
        setStatus("all");
        setEventType("all");
        break;
      case "active":
        setStatus("all");
        setEventType("successful_login");
        break;
      case "suspicious":
        setStatus("all");
        setEventType("suspicious_login_attempt");
        break;
      case "new_device":
        setStatus("all");
        setEventType("new_device_login");
        break;
      case "denied":
        setStatus("all");
        setEventType("role_access_denied");
        break;
      default:
        break;
    }
  }

  function isStatActive(key: string) {
    if (key === "total") return status === "all" && eventType === "all" && query === "" && role === "all" && !from && !to;
    if (key === "success") return status === "success" && eventType === "all";
    if (key === "failed") return status === "failed" && eventType === "all";
    if (key === "active") return eventType === "successful_login" && status === "all";
    if (key === "suspicious") return eventType === "suspicious_login_attempt" && status === "all";
    if (key === "new_device") return eventType === "new_device_login" && status === "all";
    if (key === "denied") return (eventType === "role_access_denied" || eventType === "unauthorized_access_attempt") && status === "all";
    return false;
  }

  const hasActiveFilters = query !== "" || status !== "all" || role !== "all" || eventType !== "all" || from !== "" || to !== "";

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
    const params = new URLSearchParams();
    params.set("format", format);
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "all") params.set("status", status);
    if (role && role !== "all") params.set("role", role);
    if (eventType && eventType !== "all") params.set("eventType", eventType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

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
    <div className="flex flex-col">
      {/* Sleek KPI Summary Stat Bar */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
          {summary.map((item) => {
            const active = isStatActive(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => applyCardFilter(item.key)}
                aria-pressed={active}
                className={`group relative flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 text-left transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] min-h-[58px] sm:min-h-[64px] ${
                  active
                    ? "border-[#222F57] bg-white shadow-sm ring-1.5 ring-[#222F57]/25"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full mt-0.5" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-slate-600 group-hover:text-slate-900 whitespace-normal break-words">
                    {item.label}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono text-base sm:text-lg font-extrabold tracking-tight" style={{ color: item.color }}>
                    {item.value.toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Premium Clean Filter Toolbar */}
      <div className="border-b border-slate-200/80 bg-white px-3.5 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
        <div className="flex flex-col gap-3">
          {/* Main Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Search Input & Mobile Filter Toggle */}
            <div className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[280px]">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, IP, browser..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition hover:border-slate-300 hover:bg-white focus:border-[#222F57] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#222F57]/10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute inset-y-0 right-0 my-auto mr-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`lg:hidden flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs ${
                  showMobileFilters || activeFilterCount > 0
                    ? "border-[#222F57] bg-[#222F57] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
                aria-expanded={showMobileFilters}
                aria-label="Toggle filters"
              >
                <svg className={`w-3.5 h-3.5 shrink-0 ${showMobileFilters || activeFilterCount > 0 ? "text-[#E6B024]" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E6B024] text-[10px] font-black text-slate-950">
                    {activeFilterCount}
                  </span>
                )}
                <svg className={`w-3 h-3 transition-transform duration-200 shrink-0 ${showMobileFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Desktop Filters (Inline) */}
            <div className={`${showMobileFilters ? "flex w-full" : "hidden"} lg:flex flex-wrap items-center gap-2 lg:flex-1 lg:justify-end`}>
              {/* Status Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    status !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Status: All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="blocked">Blocked</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>

              {/* Role Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    role !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Role: All</option>
                  <option value="super_admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="student">Student</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>

              {/* Event Type Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by event"
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    eventType !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Event: All Events</option>
                  <option value="successful_login">Successful login</option>
                  <option value="failed_login">Failed login</option>
                  <option value="logout">Logout</option>
                  <option value="role_access_denied">Access denied</option>
                  <option value="rate_limit_exceeded">Rate limit exceeded</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>

              {/* Date Range Group */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs h-9 w-full sm:w-auto">
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  aria-label="From date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 focus:border-[#222F57] focus:bg-white focus:outline-none"
                />
                <span className="text-slate-300 font-bold">→</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 focus:border-[#222F57] focus:outline-none focus:bg-white"
                />
              </div>

              {/* Reset Filters Link */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Clear all filters"
                >
                  <span className="text-xs">✕</span> Reset
                </button>
              )}
            </div>
          </div>

          {/* Sub-strip: Record Count & Export Actions */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-[#222F57]" />
                {filteredRows.length} {filteredRows.length === 1 ? "record found" : "records found"}
              </span>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs font-bold text-slate-400 hidden xs:inline">Export:</span>
              <button
                type="button"
                onClick={() => exportFile("csv")}
                className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                title="Export CSV"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
                </svg>
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportFile("excel")}
                className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100/60 transition cursor-pointer"
                title="Export Excel"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                type="button"
                onClick={() => exportFile("pdf")}
                className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100/60 transition cursor-pointer"
                title="Export PDF"
              >
                <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto" data-login-table>
        {filteredRows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-600">No login activity matches the selected filters.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs font-bold text-[#222F57] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Professional enterprise card list */}
            <div className="md:hidden space-y-2.5 p-3 bg-slate-100/70">
              {visibleRows.map((row) => (
                <article
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRow(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedRow(row);
                    }
                  }}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs active:bg-slate-50/70 cursor-pointer space-y-2 select-none"
                >
                  {/* Left status color accent indicator bar */}
                  <div
                    className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1.5 ${
                      row.status === "success"
                        ? "bg-emerald-500"
                        : row.status === "blocked"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />

                  <div className="pl-1 space-y-2">
                    {/* Header: User avatar + Identity & Role + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* User Avatar Badge */}
                        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#222F57]/10 to-slate-200 border border-slate-200/90 text-xs font-bold text-[#222F57] shadow-2xs">
                          {(row.user_name ?? row.email ?? "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {row.user_name ?? "Unknown user"}
                            </span>
                            {row.role && (
                              <span className="inline-flex rounded bg-[#222F57]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#222F57] capitalize">
                                {row.role === "super_admin" ? "Admin" : row.role === "staff" ? "Staff" : row.role}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {row.email ?? (row.user_id ? `ID: ${row.user_id}` : "No email")}
                          </p>
                        </div>
                      </div>

                      {/* Refined Status Badge */}
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize tracking-wide shadow-2xs ${
                          row.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : row.status === "blocked"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                            : "bg-rose-50 text-rose-700 border border-rose-200/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.status === "success"
                              ? "bg-emerald-500"
                              : row.status === "blocked"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </div>

                    {/* Middle Info Panel: Event type, IP address, Device & Browser */}
                    <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 capitalize min-w-0">
                          {getEventIcon(row.event_type, row.status)}
                          <span className="truncate">{row.event_type.replaceAll("_", " ")}</span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                          {row.ip_address ?? "—"}
                        </span>
                      </div>

                      {(row.browser || row.device_type || row.operating_system) && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-slate-700 truncate">
                            {[row.device_type, row.browser, row.operating_system].filter(Boolean).join(" • ")}
                          </span>
                        </div>
                      )}

                      {row.failure_reason && (
                        <div className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded p-1.5 border border-rose-200/70 flex items-start gap-1">
                          <span className="shrink-0 font-bold">⚠️</span>
                          <span>{row.failure_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Meta Row: Timestamp, Session Duration, Details Link */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" strokeLinecap="round" />
                        </svg>
                        <span>{dateTime(row.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {row.session_duration_seconds != null && (
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            ⏱ {Math.floor(row.session_duration_seconds / 60)}m {row.session_duration_seconds % 60}s
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                          }}
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-[#222F57] hover:text-amber-600 transition cursor-pointer"
                        >
                          Details
                          <svg className="w-3 h-3 transition group-hover:translate-x-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop Table with Clean Compact Font Size */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                    <th className="py-2.5 pl-4 pr-2">Timestamp</th>
                    <th className="py-2.5 px-2">User</th>
                    <th className="py-2.5 px-2">Email</th>
                    <th className="py-2.5 px-2">Role</th>
                    <th className="py-2.5 px-2">Event</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2 font-mono">IP Address</th>
                    <th className="py-2.5 px-2">Device / Browser</th>
                    <th className="py-2.5 px-2">Session</th>
                    <th className="py-2.5 px-2 pr-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row)}
                      className="group cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap py-2.5 pl-4 pr-2 font-mono text-xs text-slate-600 font-medium">
                        {dateTime(row.created_at)}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">{row.user_name ?? "Unknown user"}</span>
                        {row.user_id && (
                          <span className="font-mono text-[11px] text-slate-400 block truncate max-w-[130px]">{row.user_id}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-600 truncate max-w-[160px]">{row.email ?? "—"}</td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                          {row.role === "super_admin" ? "Admin" : row.role === "staff" ? "Staff" : row.role ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 px-2 font-medium text-slate-800 text-xs sm:text-sm">
                        {row.event_type.replaceAll("_", " ")}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
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
                      <td className="py-2.5 px-2 font-mono text-xs text-slate-600">{row.ip_address ?? "—"}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600 truncate max-w-[180px]">
                        {row.device_type ? `${row.device_type} • ` : ""}
                        {row.browser ?? "—"}
                      </td>
                      <td className="whitespace-nowrap py-2.5 px-2 font-mono text-xs text-slate-600">
                        {row.session_duration_seconds == null
                          ? "—"
                          : `${Math.floor(row.session_duration_seconds / 60)}m ${row.session_duration_seconds % 60}s`}
                      </td>
                      <td className="py-2.5 px-2 pr-4 text-slate-600 max-w-[150px] text-xs">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate">
                            {row.failure_reason ? (
                              <span className="text-rose-600 font-medium truncate block text-[11px]" title={row.failure_reason}>
                                {row.failure_reason}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            className="shrink-0 text-xs font-bold text-[#222F57] hover:text-amber-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between font-medium">
        <span>
          Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="login-rows" className="text-slate-500 text-xs">
            Per page:
          </label>
          <select
            id="login-rows"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-[#222F57] focus:outline-none"
          >
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((v) => v - 1)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm sm:text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          >
            Previous
          </button>
          <span className="font-bold text-slate-900 text-sm sm:text-base px-1">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((v) => v + 1)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm sm:text-base font-bold text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {/* Row Detail Drawer / Modal with Large Fonts */}
      {selectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Activity details"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="relative z-[101] max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#222F57]/10 text-lg font-black text-[#222F57]">
                  {(selectedRow.user_name ?? selectedRow.email ?? "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 capitalize">
                      {selectedRow.event_type.replaceAll("_", " ")}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-extrabold capitalize ${
                        selectedRow.status === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedRow.status === "blocked"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {selectedRow.status}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 font-semibold mt-0.5">
                    {selectedRow.user_name ?? "Unknown user"} • {selectedRow.email ?? "No email"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-2xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer text-base"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
              {[
                ["User Name", selectedRow.user_name ?? "Unknown user"],
                ["Email Address", selectedRow.email ?? "—"],
                ["User Role", selectedRow.role ? (selectedRow.role === "super_admin" ? "Admin" : selectedRow.role === "staff" ? "Staff" : selectedRow.role) : "—"],
                ["Status", selectedRow.status],
                ["Timestamp", dateTime(selectedRow.created_at)],
                ["Login Time", dateTime(selectedRow.login_at)],
                ["Logout Time", dateTime(selectedRow.logout_at)],
                [
                  "Session Duration",
                  selectedRow.session_duration_seconds == null
                    ? "—"
                    : `${Math.floor(selectedRow.session_duration_seconds / 60)}m ${selectedRow.session_duration_seconds % 60}s`,
                ],
                ["IP Address", selectedRow.ip_address ?? "—"],
                ["Device Type", selectedRow.device_type ?? "—"],
                ["Browser", selectedRow.browser ?? "—"],
                ["Operating System", selectedRow.operating_system ?? "—"],
                ["Failure Reason", selectedRow.failure_reason ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50/90 p-4 sm:p-4.5 border border-slate-200/80">
                  <dt className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-1.5 text-base sm:text-lg font-extrabold text-slate-950 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

