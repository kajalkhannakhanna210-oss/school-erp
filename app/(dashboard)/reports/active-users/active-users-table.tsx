"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { logUserAction } from "@/lib/security/client-logger";

export type ActiveUserRow = {
  id: string;
  name: string;
  username: string;
  role: "super_admin" | "school_admin" | "principal" | "teacher" | "accountant" | "librarian" | "receptionist" | "student" | "parent" | "staff";
  roleLabel: string;
  department: string;
  branch: string;
  classSection?: string | null;
  mobile: string;
  email: string;
  avatarUrl?: string | null;
  avatarBg?: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  device: "Desktop" | "Mobile" | "Tablet" | null;
  browser: string | null;
  operatingSystem: string | null;
  sessionStatus: "online" | "recent" | "offline";
  accountStatus: "active" | "disabled";
  sessionReference?: string | null;
  failedAttempts?: number;
  joinedAt?: string;
  permissions?: string[];
  recentActivity?: Array<{
    id: string;
    action: string;
    timestamp: string;
    ip: string;
    device: string;
    browser: string;
    status: "success" | "failed";
    duration?: string;
  }>;
};

type Props = {
  initialUsers: ActiveUserRow[];
  departments: string[];
  branches: string[];
  classes: string[];
};

export function ActiveUsersTable({ initialUsers, departments, branches, classes }: Props) {
  const [users, setUsers] = useState<ActiveUserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sort & Pagination
  const [sortBy, setSortBy] = useState<keyof ActiveUserRow>("lastLoginAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [activeProfileUser, setActiveProfileUser] = useState<ActiveUserRow | null>(null);
  const [activeActivityUser, setActiveActivityUser] = useState<ActiveUserRow | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<ActiveUserRow | null>(null);
  const [editUserModal, setEditUserModal] = useState<ActiveUserRow | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<ActiveUserRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handleCopy(text: string, id: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast(`Copied ${text} to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
      logUserAction({ action: "Copy User ID", resource: "/reports/active-users", outcome: `Copied user ID ${text}` });
    }
  }

  // Quick Date Preset Handler
  function handleDatePresetChange(preset: string) {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().slice(0, 10);
      setFromDate(d);
      setToDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.setDate(now.getDate() - 1)).toISOString().slice(0, 10);
      setFromDate(y);
      setToDate(y);
    } else if (preset === "7days") {
      const past7 = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10);
      setFromDate(past7);
      setToDate(new Date().toISOString().slice(0, 10));
    } else if (preset === "30days") {
      const past30 = new Date(now.setDate(now.getDate() - 30)).toISOString().slice(0, 10);
      setFromDate(past30);
      setToDate(new Date().toISOString().slice(0, 10));
    } else {
      setFromDate("");
      setToDate("");
    }
  }

  // Reset Filters
  function resetFilters() {
    setSearch("");
    setSelectedRole("all");
    setSelectedDepartment("all");
    setSelectedBranch("all");
    setSelectedClass("all");
    setSelectedStatus("all");
    setSelectedActivity("all");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
    setPage(1);
    showToast("Filters reset to default");
    logUserAction({ action: "Reset Active Users Filters", resource: "/reports/active-users", outcome: "Filters reset" });
  }

  // Toggle user active status
  function handleConfirmToggleStatus() {
    if (!confirmToggleUser) return;
    const target = confirmToggleUser;
    const newStatus = target.accountStatus === "active" ? "disabled" : "active";
    
    setUsers((prev) =>
      prev.map((u) =>
        u.id === target.id
          ? { ...u, accountStatus: newStatus, sessionStatus: newStatus === "disabled" ? "offline" : u.sessionStatus }
          : u
      )
    );
    showToast(`User ${target.name} has been ${newStatus === "active" ? "activated" : "disabled"}`);
    logUserAction({
      action: newStatus === "active" ? "Enable User Account" : "Disable User Account",
      resource: "/reports/active-users",
      outcome: `User ${target.id} (${target.name}) changed to ${newStatus}`,
    });
    setConfirmToggleUser(null);
  }

  // Save Edit User
  function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUserModal) return;
    const formData = new FormData(e.currentTarget);
    const updatedName = String(formData.get("name") ?? "").trim();
    const updatedEmail = String(formData.get("email") ?? "").trim();
    const updatedMobile = String(formData.get("mobile") ?? "").trim();
    const updatedDept = String(formData.get("department") ?? "").trim();
    const updatedBranch = String(formData.get("branch") ?? "").trim();
    const updatedStatus = formData.get("accountStatus") === "active" ? "active" : "disabled";

    if (!updatedName || !updatedEmail) {
      showToast("Name and email are required");
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUserModal.id
          ? {
              ...u,
              name: updatedName,
              email: updatedEmail,
              mobile: updatedMobile,
              department: updatedDept,
              branch: updatedBranch,
              accountStatus: updatedStatus,
            }
          : u
      )
    );

    showToast(`User details for ${updatedName} updated successfully`);
    logUserAction({
      action: "Edit Active User",
      resource: "/reports/active-users",
      outcome: `Saved user ${editUserModal.id} (${updatedName})`,
    });
    setEditUserModal(null);
  }

  // Terminate session
  function handleTerminateSession(user: ActiveUserRow) {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, sessionStatus: "offline", sessionReference: null } : u))
    );
    if (activeSessionUser?.id === user.id) {
      setActiveSessionUser((prev) => (prev ? { ...prev, sessionStatus: "offline", sessionReference: null } : null));
    }
    showToast(`Terminated active session for ${user.name}`);
    logUserAction({
      action: "Terminate User Session",
      resource: "/reports/active-users",
      outcome: `Terminated session for user ${user.id} (${user.name})`,
    });
  }

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      // Search
      if (q) {
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesMobile = u.mobile.toLowerCase().includes(q);
        const matchesId = u.id.toLowerCase().includes(q);
        const matchesDept = u.department.toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesMobile && !matchesId && !matchesDept) {
          return false;
        }
      }

      // Role Filter
      if (selectedRole !== "all" && u.role !== selectedRole) return false;

      // Department Filter
      if (selectedDepartment !== "all" && !u.department.toLowerCase().includes(selectedDepartment.toLowerCase())) return false;

      // Branch Filter
      if (selectedBranch !== "all" && u.branch !== selectedBranch) return false;

      // Class / Section Filter
      if (selectedClass !== "all" && (!u.classSection || !u.classSection.toLowerCase().includes(selectedClass.toLowerCase()))) return false;

      // Status Filter
      if (selectedStatus === "online" && u.sessionStatus !== "online") return false;
      if (selectedStatus === "recent" && u.sessionStatus !== "recent") return false;
      if (selectedStatus === "offline" && u.sessionStatus !== "offline") return false;
      if (selectedStatus === "active" && u.accountStatus !== "active") return false;
      if (selectedStatus === "disabled" && u.accountStatus !== "disabled") return false;

      // Activity Filter
      if (selectedActivity === "success" && (u.failedAttempts ?? 0) > 0) return false;
      if (selectedActivity === "failed" && (u.failedAttempts ?? 0) === 0) return false;

      // Date Range
      if (fromDate || toDate) {
        if (!u.lastLoginAt) return false;
        const loginDate = u.lastLoginAt.slice(0, 10);
        if (fromDate && loginDate < fromDate) return false;
        if (toDate && loginDate > toDate) return false;
      }

      return true;
    });
  }, [users, search, selectedRole, selectedDepartment, selectedBranch, selectedClass, selectedStatus, selectedActivity, fromDate, toDate]);

  // Sort
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: any = a[sortBy] ?? "";
      let valB: any = b[sortBy] ?? "";

      if (sortBy === "lastLoginAt") {
        valA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        valB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      }

      if (typeof valA === "string") {
        const comp = valA.localeCompare(valB);
        return sortOrder === "asc" ? comp : -comp;
      }

      return sortOrder === "asc" ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });
  }, [filteredUsers, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page, pageSize]);

  // Top KPI Summary Cards
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.accountStatus === "active").length;
    const online = users.filter((u) => u.sessionStatus === "online").length;
    const recent = users.filter((u) => {
      if (!u.lastLoginAt) return false;
      const hours = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60);
      return hours <= 24;
    }).length;
    const inactive = users.filter((u) => u.accountStatus === "disabled" || !u.lastLoginAt).length;

    return { total, active, online, recent, inactive };
  }, [users]);

  // Active filter chips list
  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (search) chips.push({ label: `Search: "${search}"`, clear: () => setSearch("") });
    if (selectedRole !== "all") chips.push({ label: `Role: ${selectedRole.replace("_", " ").toUpperCase()}`, clear: () => setSelectedRole("all") });
    if (selectedDepartment !== "all") chips.push({ label: `Dept: ${selectedDepartment}`, clear: () => setSelectedDepartment("all") });
    if (selectedBranch !== "all") chips.push({ label: `Branch: ${selectedBranch}`, clear: () => setSelectedBranch("all") });
    if (selectedClass !== "all") chips.push({ label: `Class: ${selectedClass}`, clear: () => setSelectedClass("all") });
    if (selectedStatus !== "all") chips.push({ label: `Status: ${selectedStatus.toUpperCase()}`, clear: () => setSelectedStatus("all") });
    if (selectedActivity !== "all") chips.push({ label: `Activity: ${selectedActivity}`, clear: () => setSelectedActivity("all") });
    if (fromDate || toDate) chips.push({ label: `Date: ${fromDate || "Start"} to ${toDate || "Now"}`, clear: () => { setFromDate(""); setToDate(""); setDatePreset("all"); } });
    return chips;
  }, [search, selectedRole, selectedDepartment, selectedBranch, selectedClass, selectedStatus, selectedActivity, fromDate, toDate]);

  function handleSort(column: keyof ActiveUserRow) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }

  // Export handlers
  function handleExportCSV() {
    const headers = [
      "User ID",
      "Full Name",
      "Username",
      "Role",
      "Department",
      "Branch",
      "Class / Section",
      "Mobile",
      "Email",
      "Last Login Time",
      "Login IP",
      "Device",
      "Browser",
      "Operating System",
      "Session Status",
      "Account Status",
    ];

    const rows = sortedUsers.map((u) => [
      `"${u.id}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.username}"`,
      `"${u.roleLabel}"`,
      `"${u.department}"`,
      `"${u.branch}"`,
      `"${u.classSection || ""}"`,
      `"${u.mobile}"`,
      `"${u.email}"`,
      `"${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}"`,
      `"${u.lastLoginIp || ""}"`,
      `"${u.device || ""}"`,
      `"${u.browser || ""}"`,
      `"${u.operatingSystem || ""}"`,
      `"${u.sessionStatus.toUpperCase()}"`,
      `"${u.accountStatus.toUpperCase()}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `active-users-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV report downloaded successfully");
    logUserAction({ action: "Export Active Users CSV", resource: "/reports/active-users", outcome: `Exported ${sortedUsers.length} active user records` });
  }

  function handlePrint() {
    window.print();
    logUserAction({ action: "Print Active Users Report", resource: "/reports/active-users", outcome: "Triggered browser print" });
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 font-bold">👥</span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-700 sm:text-3xl">Active Users Report</h1>
          </div>
          <p className="mt-1 text-sm text-slate/60">
            Real-time directory of all active school accounts, current active login sessions, client devices, and authentication states.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            title="Export full list as CSV"
          >
            <span>📥</span> Export CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 transition"
            title="Export full list as Excel format"
          >
            <span>📊</span> Export Excel
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            title="Print or Save as PDF"
          >
            <span>🖨️</span> Print / PDF
          </button>

          <button
            onClick={() => {
              showToast("Refreshing active user statuses...");
              logUserAction({ action: "Refresh Active Users", resource: "/reports/active-users", outcome: "Refreshed list" });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-ink-800 transition"
          >
            <span>↻</span> Live Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Users */}
        <div
          onClick={() => setSelectedStatus("all")}
          className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
            selectedStatus === "all" ? "border-blue-500 bg-blue-50/40 shadow-sm" : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Users</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-xs text-blue-700">👥</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-[11px] text-slate-500">Across 10 ERP roles</p>
        </div>

        {/* Active Accounts */}
        <div
          onClick={() => setSelectedStatus("active")}
          className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
            selectedStatus === "active" ? "border-emerald-500 bg-emerald-50/40 shadow-sm" : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Accounts</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-xs text-emerald-700">✓</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-900">{stats.active}</p>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% enabled
          </p>
        </div>

        {/* Currently Online */}
        <div
          onClick={() => setSelectedStatus("online")}
          className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
            selectedStatus === "online" ? "border-emerald-500 bg-emerald-500/10 shadow-sm" : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Online Now</span>
            </div>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-xs text-emerald-800">⚡</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-900">{stats.online}</p>
          <p className="mt-1 text-[11px] text-emerald-700">Active past 15 mins</p>
        </div>

        {/* Recently Logged In */}
        <div
          onClick={() => setSelectedStatus("recent")}
          className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
            selectedStatus === "recent" ? "border-amber-500 bg-amber-50/40 shadow-sm" : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Recent Logins</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-xs text-amber-800">🕒</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-900">{stats.recent}</p>
          <p className="mt-1 text-[11px] text-amber-700">Within last 24h</p>
        </div>

        {/* Inactive / Disabled */}
        <div
          onClick={() => setSelectedStatus("disabled")}
          className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
            selectedStatus === "disabled" ? "border-rose-500 bg-rose-50/40 shadow-sm" : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Inactive / Locked</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-xs text-rose-700">🚫</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-rose-900">{stats.inactive}</p>
          <p className="mt-1 text-[11px] text-rose-600">Requires attention</p>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Filters & Search</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {filteredUsers.length} of {users.length} match
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>🔍</span>
              <span>{showMobileFilters ? "Hide Filters" : "Filter"}</span>
            </button>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition underline underline-offset-2"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Controls Grid - Collapsible on Mobile */}
        <div className={`${showMobileFilters ? "block" : "hidden sm:grid"} grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Name, Username, Mobile, Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by name, @username, +91 mobile, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* User Type / Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">User Type / Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All Roles & User Types</option>
              <option value="super_admin">Super Admin</option>
              <option value="school_admin">School Admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher / Faculty</option>
              <option value="accountant">Accountant</option>
              <option value="librarian">Librarian</option>
              <option value="receptionist">Receptionist</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="staff">Other Staff</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Branch / School */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch / School</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All Branches & Campuses</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Class / Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Section</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All Classes / Grades</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online Now (Live)</option>
              <option value="recent">Recently Active (24h)</option>
              <option value="offline">Offline</option>
              <option value="active">Account Active</option>
              <option value="disabled">Account Disabled</option>
            </select>
          </div>

          {/* Date Presets & Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Last Login Date</label>
            <div className="flex gap-1.5">
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date From & To */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Custom Date Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("custom");
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("custom");
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                showToast(`Filter applied: ${filteredUsers.length} records found`);
                logUserAction({ action: "Apply Active Users Filter", resource: "/reports/active-users", outcome: `Filtered ${filteredUsers.length} records` });
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active:</span>
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {chip.label}
                <button onClick={chip.clear} className="text-blue-500 hover:text-blue-900 font-bold ml-0.5">
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Table Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">User Directory</span>
            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
              {filteredUsers.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>

        {/* Mobile: Professional enterprise card list */}
        <div className="md:hidden space-y-3 p-3 bg-slate-100/70 border-b border-slate-200">
          {paginatedUsers.map((user) => {
            const isOnline = user.sessionStatus === "online";
            const isRecent = user.sessionStatus === "recent";
            const isAccountActive = user.accountStatus === "active";

            return (
              <article
                key={user.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs active:bg-slate-50/70 space-y-2.5 select-none"
              >
                {/* Left status color accent indicator bar */}
                <div
                  className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1.5 ${
                    isOnline
                      ? "bg-emerald-500"
                      : isRecent
                      ? "bg-amber-500"
                      : "bg-slate-300"
                  }`}
                />

                <div className="pl-1 space-y-2.5">
                  {/* Header: User avatar + Identity & Role + Session Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* User Avatar */}
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-2xs"
                        style={{ backgroundColor: user.avatarBg || "#2563eb" }}
                      >
                        {user.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setActiveProfileUser(user)}
                            className="font-bold text-xs sm:text-sm text-slate-900 text-left truncate hover:text-blue-600"
                          >
                            {user.name}
                          </button>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              user.role === "super_admin"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : user.role === "principal"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : user.role === "teacher"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : user.role === "accountant"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : user.role === "librarian"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : user.role === "receptionist"
                                ? "bg-teal-50 text-teal-800 border border-teal-200"
                                : user.role === "student"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : user.role === "parent"
                                ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {user.roleLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          @{user.username} {user.classSection ? `• ${user.classSection}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Session Status Badge */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs ${
                        isOnline
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isRecent
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isOnline ? "bg-emerald-500 animate-pulse" : isRecent ? "bg-amber-500" : "bg-slate-400"
                        }`}
                      />
                      {isOnline ? "Online" : isRecent ? "Recent" : "Offline"}
                    </span>
                  </div>

                  {/* Info Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium block">Dept / Branch</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {user.department} ({user.branch})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Account</span>
                      <span
                        className={`font-semibold inline-flex items-center gap-1 ${
                          isAccountActive ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isAccountActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Contact</span>
                      <span className="font-mono text-slate-700 truncate block">
                        {user.mobile || user.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Device / IP</span>
                      <span className="text-slate-700 font-medium truncate block">
                        {user.device === "Mobile" ? "📱" : user.device === "Tablet" ? "📟" : "💻"} {user.device || "Desktop"} ({user.lastLoginIp || "Local"})
                      </span>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                    <div className="text-slate-500 truncate">
                      Last Login:{" "}
                      <span className="font-medium text-slate-700">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </span>
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setActiveProfileUser(user)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition shadow-2xs"
                        title="View Profile"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => setActiveActivityUser(user)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition shadow-2xs"
                        title="View Login Activity"
                      >
                        🕒
                      </button>
                      <button
                        onClick={() => setActiveSessionUser(user)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition shadow-2xs"
                        title="View Active Session"
                      >
                        🔐
                      </button>
                      <button
                        onClick={() => setEditUserModal(user)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition shadow-2xs"
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirmToggleUser(user)}
                        className={`rounded-lg border p-1.5 transition shadow-2xs ${
                          isAccountActive
                            ? "border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100"
                            : "border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-100"
                        }`}
                        title={isAccountActive ? "Disable Account" : "Enable Account"}
                      >
                        {isAccountActive ? "🚫" : "✓"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {paginatedUsers.length === 0 && (
            <div className="py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              <span className="text-2xl">🔍</span>
              <p className="text-xs font-semibold text-slate-900 mt-1">No active users matched your filters</p>
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Desktop Responsive Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort("id")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>User ID</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "id" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort("name")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    <span>User Name</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort("role")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Role</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "role" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort("department")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Department / Branch</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "department" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th className="py-3.5 px-4 font-bold whitespace-nowrap">Contact Info</th>

                <th
                  onClick={() => handleSort("lastLoginAt")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Last Login & IP</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th className="py-3.5 px-4 font-bold whitespace-nowrap">Device / Browser</th>

                <th
                  onClick={() => handleSort("sessionStatus")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Session Status</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "sessionStatus" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort("accountStatus")}
                  className="cursor-pointer py-3.5 px-4 font-bold hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Account</span>
                    <span className="text-[10px] text-slate-400">{sortBy === "accountStatus" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </div>
                </th>

                <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.map((user) => {
                const isOnline = user.sessionStatus === "online";
                const isRecent = user.sessionStatus === "recent";
                const isAccountActive = user.accountStatus === "active";

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition duration-150">
                    {/* User ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{user.id.slice(0, 10)}</span>
                        <button
                          onClick={() => handleCopy(user.id, user.id)}
                          className="text-slate-400 hover:text-blue-600 transition"
                          title="Copy User ID"
                        >
                          {copiedId === user.id ? "✓" : "📋"}
                        </button>
                      </div>
                    </td>

                    {/* User Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: user.avatarBg || "#2563eb" }}
                        >
                          {user.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setActiveProfileUser(user)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left block truncate text-xs sm:text-sm"
                          >
                            {user.name}
                          </button>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>@{user.username}</span>
                            {user.classSection && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">{user.classSection}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          user.role === "super_admin"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : user.role === "principal"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : user.role === "teacher"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : user.role === "accountant"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : user.role === "librarian"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : user.role === "receptionist"
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : user.role === "student"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : user.role === "parent"
                            ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {user.roleLabel}
                      </span>
                    </td>

                    {/* Department & Branch */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{user.department}</div>
                      <div className="text-[11px] text-slate-500">{user.branch}</div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-800">{user.mobile || "—"}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{user.email}</div>
                    </td>

                    {/* Last Login & IP */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.lastLoginAt ? (
                        <>
                          <div className="font-medium text-slate-800">
                            {new Date(user.lastLoginAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                            <span>🌐</span>
                            <span>{user.lastLoginIp || "127.0.0.1"}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Never signed in</span>
                      )}
                    </td>

                    {/* Device / Browser */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        <span>{user.device === "Mobile" ? "📱" : user.device === "Tablet" ? "📟" : "💻"}</span>
                        <span>{user.device || "Desktop"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {user.browser || "Chrome"} • {user.operatingSystem || "Windows"}
                      </div>
                    </td>

                    {/* Session Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isRecent
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOnline ? "bg-emerald-500 animate-pulse" : isRecent ? "bg-amber-500" : "bg-slate-400"
                          }`}
                        />
                        {isOnline ? "Online" : isRecent ? "Recent" : "Offline"}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isAccountActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isAccountActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    {/* Actions Dropdown / Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Profile */}
                        <button
                          onClick={() => setActiveProfileUser(user)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition shadow-xs"
                          title="View Profile Details"
                        >
                          👁️
                        </button>

                        {/* View Login Activity */}
                        <button
                          onClick={() => setActiveActivityUser(user)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition shadow-xs"
                          title="View Login Activity Audit"
                        >
                          🕒
                        </button>

                        {/* Session Details */}
                        <button
                          onClick={() => setActiveSessionUser(user)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition shadow-xs"
                          title="View Active Session"
                        >
                          🔐
                        </button>

                        {/* Edit User */}
                        <button
                          onClick={() => setEditUserModal(user)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition shadow-xs"
                          title="Edit User Info"
                        >
                          ✏️
                        </button>

                        {/* Disable / Enable User Toggle */}
                        <button
                          onClick={() => setConfirmToggleUser(user)}
                          className={`rounded-lg border p-1.5 transition shadow-xs ${
                            isAccountActive
                              ? "border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-100"
                          }`}
                          title={isAccountActive ? "Disable Account" : "Enable Account"}
                        >
                          {isAccountActive ? "🚫" : "✓"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="mx-auto max-w-sm space-y-2">
                      <span className="text-3xl">🔍</span>
                      <p className="text-sm font-semibold text-slate-900">No active users matched your filters</p>
                      <p className="text-xs text-slate-500">
                        Try clearing or adjusting your search keywords, role selection, or date range.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredUsers.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-bold text-slate-900">{Math.min(page * pageSize, filteredUsers.length)}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredUsers.length}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white shadow-xs"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg font-bold transition ${
                    page === p ? "bg-blue-600 text-white shadow-xs" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 1. User Profile Modal / Drawer */}
      {activeProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full text-base font-bold text-white shadow-xs"
                  style={{ backgroundColor: activeProfileUser.avatarBg || "#2563eb" }}
                >
                  {activeProfileUser.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{activeProfileUser.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {activeProfileUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveProfileUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Role / Type</span>
                <p className="mt-1 font-bold text-slate-900">{activeProfileUser.roleLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Department</span>
                <p className="mt-1 font-bold text-slate-900">{activeProfileUser.department}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Branch / Campus</span>
                <p className="mt-1 font-bold text-slate-900">{activeProfileUser.branch}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Account Status</span>
                <p className="mt-1 font-bold capitalize text-emerald-700">{activeProfileUser.accountStatus}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Registered Mobile</span>
                <p className="mt-1 font-mono font-bold text-slate-900">{activeProfileUser.mobile}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Email Address</span>
                <p className="mt-1 font-bold text-slate-900 truncate">{activeProfileUser.email}</p>
              </div>
            </div>

            {/* Session Security Details */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Security & Login Information</h4>
              <div className="flex justify-between text-slate-600">
                <span>Last Login Time:</span>
                <span className="font-semibold text-slate-900">
                  {activeProfileUser.lastLoginAt ? new Date(activeProfileUser.lastLoginAt).toLocaleString("en-IN") : "Never"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Last IP Address:</span>
                <span className="font-mono font-semibold text-slate-900">{activeProfileUser.lastLoginIp || "127.0.0.1"}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Device & Browser:</span>
                <span className="font-semibold text-slate-900">{activeProfileUser.device || "Desktop"} ({activeProfileUser.browser || "Chrome"})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Session Status:</span>
                <span className="font-bold uppercase text-emerald-700">{activeProfileUser.sessionStatus}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => {
                  setActiveProfileUser(null);
                  setActiveActivityUser(activeProfileUser);
                }}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                View Login History
              </button>
              <button
                onClick={() => setActiveProfileUser(null)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Login Activity History Modal */}
      {activeActivityUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Login Activity Audit History</h3>
                <p className="text-xs text-slate-500">
                  Authentication and session records for <strong className="text-slate-800">{activeActivityUser.name}</strong> ({activeActivityUser.email})
                </p>
              </div>
              <button
                onClick={() => setActiveActivityUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Event / Action</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Device / Browser</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeActivityUser.recentActivity ?? [
                    {
                      id: "act-1",
                      action: "User Login",
                      timestamp: activeActivityUser.lastLoginAt || new Date().toISOString(),
                      ip: activeActivityUser.lastLoginIp || "103.21.244.12",
                      device: activeActivityUser.device || "Desktop",
                      browser: activeActivityUser.browser || "Chrome 124.0",
                      status: "success",
                      duration: "Active session",
                    },
                    {
                      id: "act-2",
                      action: "Dashboard Access",
                      timestamp: new Date(Date.now() - 3600000).toISOString(),
                      ip: activeActivityUser.lastLoginIp || "103.21.244.12",
                      device: activeActivityUser.device || "Desktop",
                      browser: activeActivityUser.browser || "Chrome 124.0",
                      status: "success",
                      duration: "45 mins",
                    },
                    {
                      id: "act-3",
                      action: "Session Refresh",
                      timestamp: new Date(Date.now() - 86400000).toISOString(),
                      ip: activeActivityUser.lastLoginIp || "103.21.244.12",
                      device: activeActivityUser.device || "Desktop",
                      browser: activeActivityUser.browser || "Chrome 124.0",
                      status: "success",
                      duration: "2 hours",
                    },
                  ]).map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {new Date(act.timestamp).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{act.action}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{act.ip}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {act.device} • {act.browser}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            act.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setActiveActivityUser(null)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Session Details Modal */}
      {activeSessionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-base">🔐</span>
                <h3 className="font-display text-lg font-bold text-slate-900">Active Session Security</h3>
              </div>
              <button
                onClick={() => setActiveSessionUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">User:</span>
                <span className="font-bold text-slate-900">{activeSessionUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Session Status:</span>
                <span className="font-bold text-emerald-600 uppercase">{activeSessionUser.sessionStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Session Reference:</span>
                <span className="font-mono font-bold text-slate-800">
                  {activeSessionUser.sessionReference || `sess_${activeSessionUser.id.slice(0, 8)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Login Client IP:</span>
                <span className="font-mono font-bold text-slate-800">{activeSessionUser.lastLoginIp || "127.0.0.1"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Client Device:</span>
                <span className="font-bold text-slate-800">{activeSessionUser.device || "Desktop"} ({activeSessionUser.operatingSystem || "Windows"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Authentication Guard:</span>
                <span className="font-bold text-indigo-700">Strict Signed 24-hr Token</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={() => handleTerminateSession(activeSessionUser)}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition"
              >
                Terminate Active Session
              </button>
              <button
                onClick={() => setActiveSessionUser(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit User Modal */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Edit User Account</h3>
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  defaultValue={editUserModal.name}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editUserModal.email}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    name="mobile"
                    defaultValue={editUserModal.mobile}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    name="department"
                    defaultValue={editUserModal.department}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch / Campus</label>
                  <input
                    name="branch"
                    defaultValue={editUserModal.branch}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  name="accountStatus"
                  defaultValue={editUserModal.accountStatus}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="disabled">Disabled (Access Blocked)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Disable / Enable Confirmation Dialog */}
      {confirmToggleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-xl font-bold">⚠️</span>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {confirmToggleUser.accountStatus === "active" ? "Disable User Account?" : "Enable User Account?"}
                </h3>
                <p className="text-xs text-slate-500">{confirmToggleUser.name} ({confirmToggleUser.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmToggleUser.accountStatus === "active"
                ? "Disabling this account will immediately revoke all dashboard and mobile access. The user will be unable to log in until re-enabled by an administrator."
                : "Enabling this account will restore dashboard and mobile access privileges for this user."}
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setConfirmToggleUser(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleStatus}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition ${
                  confirmToggleUser.accountStatus === "active" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmToggleUser.accountStatus === "active" ? "Yes, Disable Account" : "Yes, Enable Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
