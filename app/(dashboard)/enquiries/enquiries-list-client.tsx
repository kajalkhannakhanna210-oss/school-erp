"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { EnquiryActionPermissions, EnquiryRow, STATUS_COLORS } from "@/lib/enquiries";
import { EnquiryActionsModal } from "./enquiry-actions-modal";
import { ExportEnquiryButton } from "./export-enquiry-button";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

function ActionIcon({ name }: { name: "view" | "edit" | "followup" | "assign" | "status" }) {
  const paths = {
    view: <><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></>,
    edit: <><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.2 2.2 0 0 0-3.1-3.1L4.9 16.9Z" /><path d="m14.5 7.5 3.1 3.1" /></>,
    followup: <><path d="M12 5v7l4 2" /><circle cx="12" cy="12" r="8.5" /><path d="M19 4v4m-2-2h4" /></>,
    assign: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M17 8v6m-3-3h6" /></>,
    status: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="11" cy="19" r="1.5" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{paths[name]}</svg>;
}

function mobileCardColors(status: string) {
  return {
    New: "border-blue-200 border-l-blue-500 bg-blue-50/70",
    Assigned: "border-purple-200 border-l-purple-500 bg-purple-50/70",
    "Follow-up": "border-amber-200 border-l-amber-500 bg-amber-50/70",
    Interested: "border-emerald-200 border-l-emerald-500 bg-emerald-50/70",
    Won: "border-green-300 border-l-green-600 bg-green-50/80",
    Lost: "border-rose-200 border-l-rose-500 bg-rose-50/70",
    Closed: "border-slate-200 border-l-slate-500 bg-slate-50",
  }[status] ?? "border-slate-200 border-l-slate-400 bg-white";
}

export function EnquiriesListClient({
  rows,
  total,
  canManage,
  canExport,
  staffList,
  assignStaffByEnquiry,
  activeTab = "all",
  actionPermissions,
}: {
  rows: EnquiryRow[];
  total: number;
  canManage: boolean;
  canExport: boolean;
  staffList: { id: string; full_name: string }[];
  assignStaffByEnquiry: Record<string, { id: string; full_name: string }[]>;
  activeTab?: string;
  actionPermissions: Record<string, EnquiryActionPermissions>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRow | null>(null);
  const [activeModal, setActiveModal] = useState<"assign" | "followup" | "status" | "won" | "lost" | null>(null);
  const [displayedRows, setDisplayedRows] = useState(rows);
  const [displayedTotal, setDisplayedTotal] = useState(total);
  const [displayedActionPermissions, setDisplayedActionPermissions] = useState(actionPermissions);
  const [loadingRows, setLoadingRows] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [directorySearch, setDirectorySearch] = useState(searchParams.get("q") ?? "");
  const activeFilterRef = useRef(activeTab);
  const activeSearchRef = useRef("");
  const deniedPermissions: EnquiryActionPermissions = {
    view: false,
    edit: false,
    assign: false,
    followup: false,
    change_status: false,
    convert_won: false,
    mark_lost: false,
  };

  useEffect(() => {
    setDisplayedRows(rows);
    setDisplayedTotal(total);
    setDisplayedActionPermissions(actionPermissions);
  }, [rows, total, actionPermissions]);

  useEffect(() => {
    setDirectorySearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const handleTabChange = async (event: Event) => {
      const detail = (event as CustomEvent<{ filter: string; search?: string } | string>).detail;
      const filter = typeof detail === "string" ? detail : detail?.filter;
      const search = typeof detail === "string" ? window.location.search : detail?.search;
      if (!filter || !["all", "today", "overdue", "upcoming", "won"].includes(filter)) return;
      activeFilterRef.current = filter;
      activeSearchRef.current = search ?? "";
      const params = new URLSearchParams(search ?? "");
      params.delete("followup_due");
      params.delete("status");
      params.delete("page");
      if (filter === "won") params.set("status", "Won");
      else if (filter !== "all") params.set("followup_due", filter);
      setLoadingRows(true);
      try {
        const response = await fetch("/api/enquiries/list", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filters: Object.fromEntries(params.entries()) }),
        });
        if (!response.ok) throw new Error("Unable to load enquiries");
        const result = await response.json();
        setDisplayedRows(result.rows ?? []);
        setDisplayedTotal(result.total ?? 0);
        setDisplayedActionPermissions(result.actionPermissions ?? {});
      } finally {
        setLoadingRows(false);
        window.dispatchEvent(new CustomEvent("enquiry-tab-loaded", { detail: { filter } }));
      }
    };
    window.addEventListener("enquiry-tab-change", handleTabChange);

    const refreshCurrentDirectory = async () => {
      if (document.visibilityState !== "visible") return;
      const filter = activeFilterRef.current;
      const params = new URLSearchParams(activeSearchRef.current);
      params.delete("followup_due");
      params.delete("status");
      params.delete("page");
      if (filter === "won") params.set("status", "Won");
      else if (filter !== "all") params.set("followup_due", filter);

      try {
        const response = await fetch("/api/enquiries/list", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filters: Object.fromEntries(params.entries()) }),
        });
        if (!response.ok) return;
        const result = await response.json();
        setDisplayedRows(result.rows ?? []);
        setDisplayedTotal(result.total ?? 0);
        setDisplayedActionPermissions(result.actionPermissions ?? {});
      } catch {
        // Keep the currently displayed data when a background refresh fails.
      }
    };

    const refreshLiveData = async () => {
      await refreshCurrentDirectory();
      // The tab counters and summary cards are server-rendered from the same
      // database row, so refresh the route after the websocket notification.
      router.refresh();
    };

    window.addEventListener("enquiry-live-refresh", refreshLiveData);
    window.addEventListener("focus", refreshCurrentDirectory);
    return () => {
      window.removeEventListener("enquiry-tab-change", handleTabChange);
      window.removeEventListener("enquiry-live-refresh", refreshLiveData);
      window.removeEventListener("focus", refreshCurrentDirectory);
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("enquiries-directory-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "enquiries" },
        async (payload) => {
          const filter = activeFilterRef.current;
          const params = new URLSearchParams(activeSearchRef.current);
          params.delete("followup_due");
          params.delete("status");
          params.delete("page");
          if (filter === "won") params.set("status", "Won");
          else if (filter !== "all") params.set("followup_due", filter);

          try {
            const response = await fetch("/api/enquiries/list", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ filters: Object.fromEntries(params.entries()) }),
            });
            if (!response.ok) return;
            const result = await response.json();
            setDisplayedRows(result.rows ?? []);
            setDisplayedTotal(result.total ?? 0);
            setDisplayedActionPermissions(result.actionPermissions ?? {});
            router.refresh();
          } catch {
            // The next focus refresh will reconcile the grid if this request fails.
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLiveStatus("error");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const openAction = (enquiry: EnquiryRow, type: "assign" | "followup" | "status" | "won" | "lost") => {
    setSelectedEnquiry(enquiry);
    setActiveModal(type);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const applyDirectorySearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    const query = directorySearch.trim();
    if (query) params.set("q", query);
    else params.delete("q");
    params.delete("page");
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  };

  const exportRows = displayedRows.map((r) => ({
    Enquiry_ID: r.enquiry_id,
    Student_Name: r.student_name,
    Mobile: r.mobile,
    Class: r.classes?.name ?? "—",
    Type: r.enquiry_type,
    Source: r.source,
    Assigned_Staff: r.assigned_staff?.full_name ?? "Unassigned",
    Status: r.status,
    Next_Followup: r.next_followup_date ?? "—",
    Last_Followup: r.last_followup_date ?? "—",
    Created_At: r.created_at.slice(0, 10),
  }));

  return (
    <div>
      {liveStatus === "error" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800" role="status">
          Live updates are unavailable. Apply the enquiry Realtime migration in Supabase.
        </div>
      )}
      <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3 lg:flex-row lg:items-center">
        <h2 className="font-display text-base font-bold text-ink-700">
          Enquiry Directory
          <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-slate/70">
            {displayedTotal} {displayedTotal === 1 ? "record" : "records"}
            {loadingRows && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900 align-middle" aria-label="Loading enquiries" />}
          </span>
        </h2>

        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] lg:w-auto lg:overflow-visible lg:pb-0">
          <div className="hidden lg:block">
            <label htmlFor="desktop-enquiry-search" className="sr-only">Search and narrow the directory</label>
            <input
              id="desktop-enquiry-search"
              type="search"
              placeholder="Search directory..."
              value={directorySearch}
              onChange={(event) => setDirectorySearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applyDirectorySearch()}
              className="h-9 w-52 rounded-lg border border-ink-100 bg-white px-3 text-xs outline-none transition focus:border-ink-700 focus:ring-2 focus:ring-ink-700/10 xl:w-60"
            />
          </div>
          <button
            type="button"
            aria-controls="enquiry-filter-panel"
            onClick={() => window.dispatchEvent(new Event("enquiry-filter-toggle"))}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-ink-900 px-3 text-xs font-semibold text-white transition hover:bg-ink-700 sm:hidden"
          >
            <span aria-hidden="true">☷</span>
            Filter
          </button>
          {canExport && <ExportEnquiryButton rows={exportRows} />}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/30 text-left text-xs font-bold uppercase tracking-wider text-slate/60">
              <th className="px-4 py-3">Sr. No.</th>
              <th className="px-4 py-3">Enquiry ID</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Type / Source</th>
              <th className="px-4 py-3">Assigned Staff</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next Follow-up</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, index) => {
              const permissions = displayedActionPermissions[r.id] ?? deniedPermissions;
              const isOverdue = r.next_followup_date && r.next_followup_date < new Date().toISOString().slice(0, 10) && r.status !== 'Won' && r.status !== 'Lost' && r.status !== 'Closed';
              return (
                <tr key={r.id} className="border-b border-ink-100 transition hover:bg-gold-50/20 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate/70">{index + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-ink-700">
                    {permissions.view ? <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600 hover:underline">{r.enquiry_id}</Link> : r.enquiry_id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-700">
                    {permissions.view ? <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600">{r.student_name}</Link> : r.student_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate/70">{r.mobile}</td>
                  <td className="px-4 py-3">{r.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-semibold text-ink-700">{r.enquiry_type}</span>
                    <span className="block text-slate/50">{r.source}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate/80">
                    {r.assigned_staff?.full_name ?? <span className="italic text-slate/40">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        STATUS_COLORS[r.status]?.bg ?? "bg-slate-100"
                      } ${STATUS_COLORS[r.status]?.text ?? "text-slate-700"} ${
                        STATUS_COLORS[r.status]?.border ?? "border-slate-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={isOverdue ? "font-bold text-rose-600" : "text-slate/70"}>
                      {formatDate(r.next_followup_date)}
                    </span>
                    {isOverdue && <span className="block text-[10px] uppercase font-bold text-rose-600">Overdue</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate/70">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {permissions.view && <Link href={`/enquiries/${r.id}`} aria-label="View enquiry" title="View enquiry" className="grid h-8 w-8 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100">
                          <ActionIcon name="view" />
                      </Link>}
                      {permissions.edit && <Link href={`/enquiries/${r.id}/edit`} aria-label="Edit enquiry" title="Edit enquiry" className="grid h-8 w-8 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100">
                          <ActionIcon name="edit" />
                      </Link>}

                      {/* Dropdown / Quick Action Menu */}
                      {permissions.followup && <button
                        onClick={() => openAction(r, "followup")}
                        title="Add Follow-up"
                        aria-label="Add follow-up"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-ink-700 hover:bg-ink-100"
                      >
                        <ActionIcon name="followup" />
                      </button>}

                      {permissions.assign && <button
                        onClick={() => openAction(r, "assign")}
                        title="Assign Staff"
                        aria-label="Assign staff"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100"
                      >
                        <ActionIcon name="assign" />
                      </button>}

                      {(permissions.change_status || permissions.convert_won || permissions.mark_lost) && <button
                        onClick={() => openAction(r, "status")}
                        title="Change Status"
                        aria-label="Change status"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100"
                      >
                        <ActionIcon name="status" />
                      </button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {displayedRows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-xs text-slate/50">
                  No admission enquiries found matching active filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 bg-ink-50/40 p-3 md:hidden">
        {displayedRows.map((r) => {
          const permissions = displayedActionPermissions[r.id] ?? deniedPermissions;
          return (
          <div key={r.id} className={`space-y-2 rounded-xl border border-l-4 p-3 shadow-sm transition-colors ${mobileCardColors(r.status)}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ink-700">{r.enquiry_id}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  STATUS_COLORS[r.status]?.bg ?? "bg-slate-100"
                } ${STATUS_COLORS[r.status]?.text ?? "text-slate-700"} ${STATUS_COLORS[r.status]?.border ?? "border-slate-200"}`}
              >
                {r.status}
              </span>
            </div>
            <div>
              <p className="font-bold text-ink-700">{r.student_name}</p>
              <p className="text-xs text-slate/60">{r.mobile}</p>
              <p className="text-xs text-slate/60">Class: <span className="font-bold text-ink-700">{r.classes?.name ?? "N/A"}</span> · {r.enquiry_type} ({r.source})</p>
              <p className="text-xs text-slate/50">Created: {formatDateTime(r.created_at)}</p>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 border-t border-current/10 pt-1.5 text-xs">
              <span className="min-w-0 truncate text-slate/60">Staff: {r.assigned_staff?.full_name ?? "Unassigned"}</span>
              <div className="flex shrink-0 gap-2">
                {permissions.view && <Link href={`/enquiries/${r.id}`} aria-label="View enquiry" title="View enquiry" className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-ink-700 hover:bg-ink-100">
                  <ActionIcon name="view" />
                </Link>}
                {permissions.edit && <Link href={`/enquiries/${r.id}/edit`} aria-label="Edit enquiry" title="Edit enquiry" className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-ink-700 hover:bg-ink-100">
                  <ActionIcon name="edit" />
                </Link>}
                {permissions.followup && <button onClick={() => openAction(r, "followup")} aria-label="Add follow-up" title="Add follow-up" className="grid h-8 w-8 place-items-center rounded bg-gold-50 text-gold-700 hover:bg-gold-100">
                  <ActionIcon name="followup" />
                </button>}
                {permissions.assign && <button onClick={() => openAction(r, "assign")} aria-label="Assign staff" title="Assign staff" className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100">
                  <ActionIcon name="assign" />
                </button>}
                {(permissions.change_status || permissions.convert_won || permissions.mark_lost) && <button onClick={() => openAction(r, "status")} aria-label="Change status" title="Change status" className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100">
                  <ActionIcon name="status" />
                </button>}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal Trigger */}
      {selectedEnquiry && activeModal && (
        <EnquiryActionsModal
          enquiry={selectedEnquiry}
          staffList={assignStaffByEnquiry[selectedEnquiry.id] ?? []}
          actionType={activeModal}
          onClose={() => {
            setSelectedEnquiry(null);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}
