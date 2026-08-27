"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { EnquiryRow, STATUS_COLORS } from "@/lib/enquiries";
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

function playNewEnquirySound() {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("/sounds/two_tone_new_enquiry_alert.wav");
    audio.volume = 0.8;
    void audio.play().catch(() => {
      // Browser autoplay restrictions must not interrupt live data updates.
    });
  } catch {
    // Browser autoplay restrictions must not interrupt live data updates.
  }
}

export function EnquiriesListClient({
  rows,
  total,
  canManage,
  staffList,
  activeTab = "all",
}: {
  rows: EnquiryRow[];
  total: number;
  canManage: boolean;
  staffList: { id: string; full_name: string }[];
  activeTab?: string;
}) {
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRow | null>(null);
  const [activeModal, setActiveModal] = useState<"assign" | "followup" | "status" | "won" | "lost" | null>(null);
  const [displayedRows, setDisplayedRows] = useState(rows);
  const [displayedTotal, setDisplayedTotal] = useState(total);
  const [loadingRows, setLoadingRows] = useState(false);
  const [newLeadNotice, setNewLeadNotice] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const activeFilterRef = useRef(activeTab);
  const activeSearchRef = useRef("");

  useEffect(() => {
    setDisplayedRows(rows);
    setDisplayedTotal(total);
  }, [rows, total]);

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
      } catch {
        // Keep the currently displayed data when a background refresh fails.
      }
    };

    window.addEventListener("focus", refreshCurrentDirectory);
    return () => {
      window.removeEventListener("enquiry-tab-change", handleTabChange);
      window.removeEventListener("focus", refreshCurrentDirectory);
    };
  }, []);

  useEffect(() => {
    const unlockBrowserAlerts = () => {
      if ("Notification" in window && window.Notification.permission === "default") {
        void window.Notification.requestPermission();
      }
      try {
        const audio = new Audio("/sounds/two_tone_new_enquiry_alert.wav");
        audio.muted = true;
        void audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => undefined);
      } catch {
        // Browser may block autoplay until a later interaction.
      }
    };
    window.addEventListener("pointerdown", unlockBrowserAlerts, { once: true });
    return () => window.removeEventListener("pointerdown", unlockBrowserAlerts);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("enquiries-live-broadcast")
      .on("broadcast", { event: "NEW_ENQUIRY" }, async ({ payload }) => {
        const id = (payload as { id?: string } | null)?.id;
        if (!id) return;
        window.dispatchEvent(new CustomEvent("enquiry-tab-change", {
          detail: { filter: activeFilterRef.current, search: activeSearchRef.current },
        }));
        try {
          const response = await fetch("/api/enquiries/list", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ filters: { q: id, page: "1", pageSize: "1" } }),
          });
          if (!response.ok) return;
          const result = await response.json();
          const enquiry = result.rows?.[0];
          if (!enquiry) return;
          const message = `New enquiry received: ${enquiry.student_name}`;
          setNewLeadNotice(message);
          playNewEnquirySound();
          if ("Notification" in window && window.Notification.permission === "granted") {
            new window.Notification("New Enquiry", { body: message, tag: `enquiry-${id}` });
          }
          window.setTimeout(() => setNewLeadNotice(null), 6000);
        } catch {
          // The normal Realtime table event or focus refresh can reconcile later.
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
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

            const insertedId = (payload.new as { id?: string } | null)?.id;
            const insertedRow = (result.rows ?? []).find((row: EnquiryRow) => row.id === insertedId);
            if (insertedRow) {
              const message = `New enquiry received: ${insertedRow.student_name}`;
              setNewLeadNotice(message);
              playNewEnquirySound();
              if (typeof window !== "undefined" && "Notification" in window) {
                const showNotification = () => new window.Notification("New Enquiry", {
                  body: message,
                  tag: `enquiry-${insertedRow.id}`,
                });
                if (window.Notification.permission === "granted") {
                  showNotification();
                } else if (window.Notification.permission === "default") {
                  void window.Notification.requestPermission().then((permission) => {
                    if (permission === "granted") showNotification();
                  });
                }
              }
              window.setTimeout(() => setNewLeadNotice(null), 6000);
            }
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
      {newLeadNotice && (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800" role="status">
          <span>{newLeadNotice}</span>
          <button type="button" onClick={() => setNewLeadNotice(null)} aria-label="Dismiss notification" className="text-lg leading-none text-emerald-700 hover:text-emerald-950">×</button>
        </div>
      )}
      <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-base font-bold text-ink-700">
          Enquiry Directory
          <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-slate/70">
            {displayedTotal} {displayedTotal === 1 ? "record" : "records"}
            {loadingRows && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900 align-middle" aria-label="Loading enquiries" />}
          </span>
        </h2>

        <ExportEnquiryButton rows={exportRows} />
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
              const isOverdue = r.next_followup_date && r.next_followup_date < new Date().toISOString().slice(0, 10) && r.status !== 'Won' && r.status !== 'Lost' && r.status !== 'Closed';
              return (
                <tr key={r.id} className="border-b border-ink-100 transition hover:bg-gold-50/20 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate/70">{index + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-ink-700">
                    <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600 hover:underline">
                      {r.enquiry_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-700">
                    <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600">
                      {r.student_name}
                    </Link>
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
                      <Link href={`/enquiries/${r.id}`} aria-label="View enquiry" title="View enquiry" className="grid h-8 w-8 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100">
                          <ActionIcon name="view" />
                      </Link>
                      <Link href={`/enquiries/${r.id}/edit`} aria-label="Edit enquiry" title="Edit enquiry" className="grid h-8 w-8 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100">
                          <ActionIcon name="edit" />
                      </Link>

                      {/* Dropdown / Quick Action Menu */}
                        <button
                        onClick={() => openAction(r, "followup")}
                        title="Add Follow-up"
                        aria-label="Add follow-up"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-ink-700 hover:bg-ink-100"
                      >
                        <ActionIcon name="followup" />
                      </button>

                      <button
                        onClick={() => openAction(r, "assign")}
                        title="Assign Staff"
                        aria-label="Assign staff"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100"
                      >
                        <ActionIcon name="assign" />
                      </button>

                      <button
                        onClick={() => openAction(r, "status")}
                        title="Change Status"
                        aria-label="Change status"
                        className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-slate/70 hover:bg-ink-100"
                      >
                        <ActionIcon name="status" />
                      </button>
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
      <div className="divide-y divide-ink-100 md:hidden">
        {displayedRows.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ink-700">{r.enquiry_id}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  STATUS_COLORS[r.status]?.bg ?? "bg-slate-100"
                } ${STATUS_COLORS[r.status]?.text ?? "text-slate-700"}`}
              >
                {r.status}
              </span>
            </div>
            <div>
              <p className="font-bold text-ink-700">{r.student_name}</p>
              <p className="text-xs text-slate/60">{r.mobile}</p>
              <p className="text-xs text-slate/60">Class: {r.classes?.name ?? "N/A"} · {r.enquiry_type} ({r.source})</p>
              <p className="text-xs text-slate/50">Created: {formatDateTime(r.created_at)}</p>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-ink-100/60 pt-2">
              <span className="text-slate/60">Staff: {r.assigned_staff?.full_name ?? "Unassigned"}</span>
              <div className="flex gap-2">
                <Link href={`/enquiries/${r.id}`} aria-label="View enquiry" title="View enquiry" className="grid h-8 w-8 place-items-center rounded bg-ink-50 text-ink-700 hover:bg-ink-100">
                  <ActionIcon name="view" />
                </Link>
                <button onClick={() => openAction(r, "followup")} aria-label="Add follow-up" title="Add follow-up" className="grid h-8 w-8 place-items-center rounded bg-gold-50 text-gold-700 hover:bg-gold-100">
                  <ActionIcon name="followup" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Trigger */}
      {selectedEnquiry && activeModal && (
        <EnquiryActionsModal
          enquiry={selectedEnquiry}
          staffList={staffList}
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
