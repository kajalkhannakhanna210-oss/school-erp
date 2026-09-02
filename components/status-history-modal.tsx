"use client";

import { useState } from "react";

export type StatusHistoryItem = { id: string; status: "active" | "inactive"; reason: string; created_at: string; created_by?: string | null };

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(value)); }

export function StatusHistoryModal({ title, items }: { title: string; items: StatusHistoryItem[] }) {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const latest = items[0];
  const filteredItems = statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter);
  if (!latest) return <span className="text-xs text-slate/45">—</span>;
  return <>
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 md:max-w-[260px]">
      <p className="min-w-0 flex-1 truncate text-xs text-slate/65" title={latest.reason}>{latest.reason}</p>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-700 shadow-sm transition hover:border-ink-300 hover:bg-ink-50" aria-label={`View all remarks for ${title}`}>View more</button>
    </div>
    {open && <div className="fixed inset-0 z-[110] grid place-items-center bg-ink-900/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="status-history-title">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 bg-gradient-to-br from-ink-700 to-ink-600 p-4 text-white sm:p-5">
          <div className="min-w-0"><h2 id="status-history-title" className="truncate font-display text-lg font-semibold">Status changes</h2><p className="mt-0.5 truncate text-xs text-white/70">{title}</p></div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-xl text-white/80 hover:bg-white/10" aria-label="Close activity history">×</button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto p-3 sm:p-4"><div className="mb-2.5 flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-slate/60">Filter:</span>{(["all", "active", "inactive"] as const).map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition ${statusFilter === filter ? "bg-ink-700 text-white" : "border border-ink-100 bg-white text-slate/65 hover:bg-ink-50"}`}>{filter}</button>)}</div><span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-700">{items.length} {items.length === 1 ? "change" : "changes"}</span></div><div className="relative space-y-3 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-ink-100">{filteredItems.length ? filteredItems.map((item, index) => <div key={item.id} className="relative flex gap-3"><span className={`relative z-10 mt-1.5 h-[23px] w-[23px] shrink-0 rounded-full border-4 border-white shadow-sm ${item.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden="true" /><div className="min-w-0 flex-1 rounded-xl border border-ink-100 bg-white p-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.status === "active" ? "Active" : "Inactive"}</span><time className="text-[11px] font-medium text-slate/55">{formatDate(item.created_at)}</time></div><p className="mt-2 break-words whitespace-pre-wrap text-sm leading-5 text-ink-700">{item.reason}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-50 pt-2 text-[11px] text-slate/55"><span>Created by: <strong className="text-slate/75">{item.created_by ?? "Unknown user"}</strong></span>{index === 0 && <span className="font-bold text-gold-700">Latest</span>}</div></div></div>) : <p className="rounded-xl border border-dashed border-ink-100 px-4 py-8 text-center text-sm text-slate/60">No {statusFilter} status changes found.</p>}</div></div>
        <div className="flex justify-end border-t border-ink-100 bg-slate-50/60 p-4"><button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-600">Close</button></div>
      </div>
    </div>}
  </>;
}
