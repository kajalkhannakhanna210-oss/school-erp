"use client";

import { useState, useMemo } from "react";
import type { UserRole } from "@/lib/types";

export type AccessLogRow = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  email: string | null;
  role: UserRole | null;
  module: string;
  page: string;
  resource: string;
  request_method: string;
  action: string;
  status_code: number;
  ip_address: string | null;
  device: string | null;
  browser: string | null;
  operating_system: string | null;
  user_agent: string | null;
  response_time_ms: number;
  session_reference: string | null;
  request_id: string | null;
  outcome: string | null;
  created_at: string;
};

type Props = {
  rows: AccessLogRow[];
};

const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

function getStatusDetails(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return {
      label: `${statusCode} OK`,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dot: "bg-emerald-500",
      border: "border-emerald-500",
      color: "#16a34a",
    };
  }
  if (statusCode >= 300 && statusCode < 400) {
    return {
      label: `${statusCode} Redirect`,
      bg: "bg-blue-50 text-blue-700 border-blue-200/80",
      dot: "bg-blue-500",
      border: "border-blue-500",
      color: "#2563eb",
    };
  }
  if (statusCode === 401) {
    return {
      label: "401 Unauthorized",
      bg: "bg-amber-50 text-amber-700 border-amber-200/80",
      dot: "bg-amber-500",
      border: "border-amber-500",
      color: "#d97706",
    };
  }
  if (statusCode === 403) {
    return {
      label: "403 Forbidden",
      bg: "bg-amber-50 text-amber-700 border-amber-200/80",
      dot: "bg-amber-500",
      border: "border-amber-500",
      color: "#d97706",
    };
  }
  if (statusCode === 429) {
    return {
      label: "429 Rate Limited",
      bg: "bg-rose-50 text-rose-700 border-rose-200/80",
      dot: "bg-rose-500",
      border: "border-rose-500",
      color: "#e11d48",
    };
  }
  if (statusCode >= 400 && statusCode < 500) {
    return {
      label: `${statusCode} Error`,
      bg: "bg-rose-50 text-rose-700 border-rose-200/80",
      dot: "bg-rose-500",
      border: "border-rose-500",
      color: "#e11d48",
    };
  }
  return {
    label: `${statusCode} Server Error`,
    bg: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    border: "border-rose-500",
    color: "#dc2626",
  };
}

function getMethodBadge(method: string) {
  const m = (method || "GET").toUpperCase();
  if (m === "GET") return "bg-blue-50 text-blue-700 border-blue-200/80";
  if (m === "POST") return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  if (m === "PUT" || m === "PATCH") return "bg-amber-50 text-amber-700 border-amber-200/80";
  if (m === "DELETE") return "bg-rose-50 text-rose-700 border-rose-200/80";
  return "bg-slate-100 text-slate-700 border-slate-200/80";
}

function getMethodIcon(method: string) {
  const m = (method || "GET").toUpperCase();
  if (m === "GET") {
    return (
      <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );
  }
  if (m === "POST") {
    return (
      <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    );
  }
  if (m === "PUT" || m === "PATCH") {
    return (
      <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }
  if (m === "DELETE") {
    return (
      <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function getRoleLabel(role: UserRole | null | string) {
  if (!role) return "System / Guest";
  if (role === "super_admin") return "Admin";
  if (role === "staff") return "Staff";
  if (role === "student") return "Student";
  return String(role);
}

export function AccessLogsTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [latencyFilter, setLatencyFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<AccessLogRow | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Dynamic dropdown list of modules from current data
  const moduleOptions = useMemo(() => {
    const defaultModules = ["Students", "Staff", "Attendance", "Fees & Finance", "Examination", "Academics", "Reports", "Documents", "Website CMS", "Admissions", "Settings", "Auth", "API"];
    const foundModules = Array.from(new Set(rows.map((r) => r.module).filter(Boolean)));
    const merged = Array.from(new Set([...foundModules, ...defaultModules]));
    return ["all", ...merged.sort()];
  }, [rows]);

  const activeFilterCount = [
    status !== "all",
    role !== "all",
    selectedModule !== "all",
    selectedMethod !== "all",
    selectedDevice !== "all",
    latencyFilter !== "all",
    Boolean(from),
    Boolean(to),
  ].filter(Boolean).length;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.user_name,
          row.email,
          row.user_id,
          row.resource,
          row.page,
          row.module,
          row.ip_address,
          row.browser,
          row.device,
          row.request_id,
          row.action,
          row.outcome,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      let matchesStatus = true;
      if (status === "success") matchesStatus = row.status_code >= 200 && row.status_code < 300;
      else if (status === "failed") matchesStatus = row.status_code >= 400;
      else if (status === "unauthorized") matchesStatus = row.status_code === 401 || row.status_code === 403;
      else if (status === "forbidden") matchesStatus = row.status_code === 403;
      else if (status === "client_error") matchesStatus = row.status_code >= 400 && row.status_code < 500;
      else if (status === "server_error") matchesStatus = row.status_code >= 500;

      const matchesRole = role === "all" || row.role === role;
      const matchesModule = selectedModule === "all" || row.module === selectedModule;
      
      let matchesMethod = true;
      if (selectedMethod === "writes") {
        matchesMethod = ["POST", "PUT", "PATCH", "DELETE"].includes((row.request_method || "").toUpperCase());
      } else if (selectedMethod !== "all") {
        matchesMethod = (row.request_method || "").toUpperCase() === selectedMethod.toUpperCase();
      }

      const matchesDevice = selectedDevice === "all" || row.device === selectedDevice;

      let matchesLatency = true;
      if (latencyFilter === "fast") matchesLatency = (row.response_time_ms ?? 0) < 200;
      else if (latencyFilter === "slow") matchesLatency = (row.response_time_ms ?? 0) >= 1000;

      const rowDate = (row.created_at || "").slice(0, 10);
      const matchesFrom = !from || rowDate >= from;
      const matchesTo = !to || rowDate <= to;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesRole &&
        matchesModule &&
        matchesMethod &&
        matchesDevice &&
        matchesLatency &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [rows, normalizedQuery, status, role, selectedModule, selectedMethod, selectedDevice, latencyFilter, from, to]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const totalUsers = new Set(rows.map((r) => r.user_id || r.email).filter(Boolean)).size;
  const totalIps = new Set(rows.map((r) => r.ip_address).filter(Boolean)).size;

  const summary = [
    { label: "Total Requests", value: rows.length, color: "#2563eb", key: "total" },
    {
      label: "Successful (2xx)",
      value: rows.filter((r) => r.status_code >= 200 && r.status_code < 300).length,
      color: "#16a34a",
      key: "success",
    },
    {
      label: "Failed (4xx/5xx)",
      value: rows.filter((r) => r.status_code >= 400).length,
      color: "#e11d48",
      key: "failed",
    },
    {
      label: "Unauthorized",
      value: rows.filter((r) => r.status_code === 401 || r.status_code === 403).length,
      color: "#d97706",
      key: "unauthorized",
    },
    { label: "Unique Users", value: totalUsers, color: "#9333ea", key: "unique_users" },
    { label: "Unique IPs", value: totalIps, color: "#0891b2", key: "unique_ips" },
    {
      label: "Write Actions",
      value: rows.filter((r) => ["POST", "PUT", "PATCH", "DELETE"].includes((r.request_method || "").toUpperCase())).length,
      color: "#475569",
      key: "writes",
    },
    {
      label: "Slow (>1s)",
      value: rows.filter((r) => (r.response_time_ms ?? 0) >= 1000).length,
      color: "#dc2626",
      key: "slow",
    },
  ];

  function applyCardFilter(key: string) {
    setPage(1);
    if (isStatActive(key) && key !== "total") {
      setStatus("all");
      setSelectedMethod("all");
      setLatencyFilter("all");
      return;
    }

    switch (key) {
      case "total":
        resetFilters();
        break;
      case "success":
        setStatus("success");
        setSelectedMethod("all");
        setLatencyFilter("all");
        break;
      case "failed":
        setStatus("failed");
        setSelectedMethod("all");
        setLatencyFilter("all");
        break;
      case "unauthorized":
        setStatus("unauthorized");
        setSelectedMethod("all");
        setLatencyFilter("all");
        break;
      case "unique_users":
      case "unique_ips":
        setStatus("all");
        setSelectedMethod("all");
        setLatencyFilter("all");
        break;
      case "writes":
        setStatus("all");
        setSelectedMethod("writes");
        setLatencyFilter("all");
        break;
      case "slow":
        setStatus("all");
        setSelectedMethod("all");
        setLatencyFilter("slow");
        break;
      default:
        break;
    }
  }

  function isStatActive(key: string) {
    if (key === "total") {
      return status === "all" && selectedMethod === "all" && latencyFilter === "all" && role === "all" && selectedModule === "all" && query === "" && !from && !to;
    }
    if (key === "success") return status === "success" && selectedMethod === "all" && latencyFilter === "all";
    if (key === "failed") return status === "failed" && selectedMethod === "all" && latencyFilter === "all";
    if (key === "unauthorized") return status === "unauthorized" && selectedMethod === "all" && latencyFilter === "all";
    if (key === "writes") return selectedMethod === "writes" && status === "all";
    if (key === "slow") return latencyFilter === "slow" && status === "all";
    return false;
  }

  const hasActiveFilters =
    query !== "" ||
    status !== "all" ||
    role !== "all" ||
    selectedModule !== "all" ||
    selectedMethod !== "all" ||
    selectedDevice !== "all" ||
    latencyFilter !== "all" ||
    from !== "" ||
    to !== "";

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setRole("all");
    setSelectedModule("all");
    setSelectedMethod("all");
    setSelectedDevice("all");
    setLatencyFilter("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function copyIpToClipboard(ip: string | null) {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  }

  async function exportFile(format: "csv" | "excel" | "pdf") {
    const params = new URLSearchParams();
    params.set("format", format);
    if (query.trim()) params.set("q", query.trim());
    if (status !== "all") params.set("status", status);
    if (role !== "all") params.set("role", role);
    if (selectedModule !== "all") params.set("module", selectedModule);
    if (selectedMethod !== "all") params.set("method", selectedMethod);
    if (selectedDevice !== "all") params.set("device", selectedDevice);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const response = await fetch(`/api/reports/access-logs?${params.toString()}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `access-logs-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : format}`;
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
                  placeholder="Search user, module, resource, IP, request ID..."
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
                <svg
                  className={`w-3.5 h-3.5 shrink-0 ${
                    showMobileFilters || activeFilterCount > 0 ? "text-[#E6B024]" : "text-slate-500"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E6B024] text-[10px] font-black text-slate-950">
                    {activeFilterCount}
                  </span>
                )}
                <svg
                  className={`w-3 h-3 transition-transform duration-200 shrink-0 ${showMobileFilters ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Desktop & Mobile Filters */}
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
                  <option value="success">Success (2xx)</option>
                  <option value="failed">Failed (4xx/5xx)</option>
                  <option value="unauthorized">Unauthorized (401/403)</option>
                  <option value="client_error">Client Error (4xx)</option>
                  <option value="server_error">Server Error (5xx)</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>

              {/* Module Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by module"
                  value={selectedModule}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    selectedModule !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Module: All Modules</option>
                  {moduleOptions
                    .filter((m) => m !== "all")
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>

              {/* Method Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by method"
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    selectedMethod !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Method: All</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="writes">All Writes (POST/PUT/DEL)</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>

              {/* Device Select */}
              <div className="relative w-full sm:w-auto">
                <select
                  aria-label="Filter by device"
                  value={selectedDevice}
                  onChange={(e) => {
                    setSelectedDevice(e.target.value);
                    setPage(1);
                  }}
                  className={`h-9 w-full sm:w-auto rounded-xl border px-3 text-xs font-semibold transition cursor-pointer shadow-2xs appearance-none pr-7 ${
                    selectedDevice !== "all"
                      ? "border-[#222F57] bg-[#222F57]/5 text-[#222F57]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <option value="all">Device: All</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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

              {/* Reset Filters Button */}
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

      {/* Records Display: Mobile Cards & Desktop Table */}
      <div className="overflow-x-auto" data-access-table>
        {filteredRows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-600">No access logs match the selected filters.</p>
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
            {/* Mobile: Enterprise card list */}
            <div className="md:hidden space-y-2.5 p-3 bg-slate-100/70">
              {visibleRows.map((row) => {
                const statusMeta = getStatusDetails(row.status_code);
                const methodBadgeClass = getMethodBadge(row.request_method);

                return (
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
                        row.status_code >= 200 && row.status_code < 300
                          ? "bg-emerald-500"
                          : row.status_code >= 300 && row.status_code < 400
                          ? "bg-blue-500"
                          : row.status_code === 401 || row.status_code === 403
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
                                {row.user_name ?? "Anonymous / System"}
                              </span>
                              {row.role && (
                                <span className="inline-flex rounded bg-[#222F57]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#222F57] capitalize">
                                  {getRoleLabel(row.role)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {row.email ?? (row.user_id ? `ID: ${row.user_id}` : "No email")}
                            </p>
                          </div>
                        </div>

                        {/* Status Code Badge */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-2xs border ${statusMeta.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                      </div>

                      {/* Middle Info Panel: Method, Resource, Module, Action, IP, Device */}
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase border ${methodBadgeClass}`}>
                              {getMethodIcon(row.request_method)}
                              {row.request_method || "GET"}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900 truncate">
                              {row.resource}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                            {row.ip_address ?? "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                          <span className="inline-flex items-center rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {row.module}
                          </span>
                          <span className="font-medium text-slate-700 truncate">
                            Action: <span className="font-bold text-slate-900">{row.action}</span>
                          </span>
                          {(row.device || row.browser || row.operating_system) && (
                            <span className="text-slate-500 truncate ml-auto">
                              {[row.device, row.browser, row.operating_system].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>

                        {row.outcome && (
                          <div
                            className={`text-[11px] rounded p-1.5 border flex items-start gap-1 font-medium ${
                              row.status_code >= 400
                                ? "text-rose-800 bg-rose-50 border-rose-200/70"
                                : "text-slate-700 bg-white border-slate-200/80"
                            }`}
                          >
                            <span className="shrink-0 font-bold">{row.status_code >= 400 ? "⚠️" : "ℹ️"}</span>
                            <span className="truncate">{row.outcome}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Meta Row: Timestamp, Latency, Details Button */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" strokeLinecap="round" />
                          </svg>
                          <span>{dateTime(row.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              row.response_time_ms >= 1000
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : row.response_time_ms >= 300
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            ⚡ {row.response_time_ms ?? 0} ms
                          </span>
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
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                    <th className="py-2.5 pl-4 pr-2">Timestamp</th>
                    <th className="py-2.5 px-2">User</th>
                    <th className="py-2.5 px-2">Email / Role</th>
                    <th className="py-2.5 px-2">Module & Resource</th>
                    <th className="py-2.5 px-2">Method</th>
                    <th className="py-2.5 px-2">Action</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2 font-mono">IP Address</th>
                    <th className="py-2.5 px-2">Device / Browser</th>
                    <th className="py-2.5 px-2">Latency</th>
                    <th className="py-2.5 px-2 pr-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => {
                    const statusMeta = getStatusDetails(row.status_code);
                    const methodBadgeClass = getMethodBadge(row.request_method);

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRow(row)}
                        className="group cursor-pointer transition hover:bg-slate-50/80"
                      >
                        {/* Timestamp */}
                        <td className="whitespace-nowrap py-2.5 pl-4 pr-2 font-mono text-xs text-slate-600 font-medium">
                          {dateTime(row.created_at)}
                        </td>

                        {/* User */}
                        <td className="py-2.5 px-2">
                          <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                            {row.user_name ?? "Anonymous / System"}
                          </span>
                          {row.user_id && (
                            <span className="font-mono text-[11px] text-slate-400 block truncate max-w-[130px]">
                              {row.user_id}
                            </span>
                          )}
                        </td>

                        {/* Email & Role */}
                        <td className="py-2.5 px-2">
                          <div className="text-xs text-slate-600 truncate max-w-[160px]">{row.email ?? "—"}</div>
                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 capitalize mt-0.5">
                            {getRoleLabel(row.role)}
                          </span>
                        </td>

                        {/* Module & Resource */}
                        <td className="py-2.5 px-2 max-w-[220px]">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                              {row.module}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">{row.page}</span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-800 truncate block" title={row.resource}>
                            {row.resource}
                          </span>
                        </td>

                        {/* Method */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase border ${methodBadgeClass}`}>
                            {getMethodIcon(row.request_method)}
                            {row.request_method || "GET"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="whitespace-nowrap py-2.5 px-2 font-medium text-slate-800 text-xs sm:text-sm">
                          {row.action}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide border shadow-2xs ${statusMeta.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="py-2.5 px-2 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {row.ip_address ?? "—"}
                        </td>

                        {/* Device / Browser */}
                        <td className="py-2.5 px-2 text-xs text-slate-600 truncate max-w-[170px]">
                          {row.device ? `${row.device} • ` : ""}
                          {row.browser ?? "—"}
                        </td>

                        {/* Latency */}
                        <td className="whitespace-nowrap py-2.5 px-2 font-mono text-xs">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-[11px] border ${
                              row.response_time_ms >= 1000
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : row.response_time_ms >= 300
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {row.response_time_ms ?? 0} ms
                          </span>
                        </td>

                        {/* Details View Button */}
                        <td className="py-2.5 px-2 pr-4 text-slate-600 whitespace-nowrap text-xs text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                            }}
                            className="shrink-0 text-xs font-bold text-[#222F57] hover:text-amber-600 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
          <label htmlFor="access-rows" className="text-slate-500 text-xs">
            Per page:
          </label>
          <select
            id="access-rows"
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

      {/* Row Detail Drawer / Modal */}
      {selectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Access log details"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="relative z-[101] max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200/90"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#222F57]/10 text-lg font-black text-[#222F57]">
                  {(selectedRow.user_name ?? selectedRow.email ?? "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-black uppercase border ${getMethodBadge(selectedRow.request_method)}`}>
                      {getMethodIcon(selectedRow.request_method)}
                      {selectedRow.request_method || "GET"}
                    </span>
                    <h2 className="text-lg sm:text-xl font-mono font-bold text-slate-950 truncate max-w-sm sm:max-w-md">
                      {selectedRow.resource}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold capitalize border ${getStatusDetails(selectedRow.status_code).bg}`}
                    >
                      {getStatusDetails(selectedRow.status_code).label}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 font-semibold mt-0.5">
                    {selectedRow.user_name ?? "Anonymous / System"} • {selectedRow.email ?? "No email registered"} • <span className="text-[#222F57]">{selectedRow.module}</span>
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

            {/* Modal Grid of Key-Values */}
            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
              {[
                ["User Name", selectedRow.user_name ?? "Anonymous / System"],
                ["Email Address", selectedRow.email ?? "—"],
                ["User Role", getRoleLabel(selectedRow.role)],
                ["Module", selectedRow.module],
                ["Page Name", selectedRow.page],
                ["Action Performed", selectedRow.action],
                ["HTTP Method", selectedRow.request_method],
                ["Status Code", `${selectedRow.status_code} (${selectedRow.status_code < 400 ? "Success" : "Failed / Disallowed"})`],
                ["Timestamp", dateTime(selectedRow.created_at)],
                [
                  "Response Latency",
                  selectedRow.response_time_ms != null ? `${selectedRow.response_time_ms} ms` : "—",
                ],
                [
                  "IP Address",
                  selectedRow.ip_address ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>{selectedRow.ip_address}</span>
                      <button
                        type="button"
                        onClick={() => copyIpToClipboard(selectedRow.ip_address)}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                      >
                        {copiedIp === selectedRow.ip_address ? "Copied!" : "Copy"}
                      </button>
                    </span>
                  ) : (
                    "—"
                  ),
                ],
                ["Device Type", selectedRow.device ?? "—"],
                ["Browser", selectedRow.browser ?? "—"],
                ["Operating System", selectedRow.operating_system ?? "—"],
                ["Request ID", selectedRow.request_id ?? "—"],
                ["Session Reference", selectedRow.session_reference ?? "—"],
                ["Outcome / Result", selectedRow.outcome ?? "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-slate-50/90 p-4 sm:p-4.5 border border-slate-200/80">
                  <dt className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-1.5 text-base sm:text-lg font-extrabold text-slate-950 break-words">{value}</dd>
                </div>
              ))}

              {/* Full User Agent span across 2 columns */}
              {selectedRow.user_agent && (
                <div className="sm:col-span-2 rounded-2xl bg-slate-50/90 p-4 sm:p-4.5 border border-slate-200/80">
                  <dt className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">Raw User Agent</dt>
                  <dd className="mt-1.5 font-mono text-xs sm:text-sm font-medium text-slate-800 break-all select-all bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedRow.user_agent}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
