"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { StaffStatusButton } from "./staff-status-button";

export type StaffRow = {
  id: string;
  photo_url: string | null;
  employee_id: string;
  department: string | null;
  designation: string | null;
  mobile_number: string | null;
  is_active: boolean;
  profiles: { full_name: string } | null;
};

function displayName(name: string | null | undefined) {
  return (name ?? "").replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
}

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/70 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate/60">
                <th className="px-4 py-3.5">Employee ID</th>
                <th className="px-4 py-3.5">Staff Name</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Designation</th>
                <th className="px-4 py-3.5">Mobile</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {staff.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-gold-50/20">
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-ink-700">
                    <span className="rounded-md bg-ink-50 px-2 py-1 border border-ink-100">{s.employee_id}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (s.photo_url) {
                            e.preventDefault();
                            setPreviewUrl(s.photo_url);
                          }
                        }}
                        className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold transition ${
                          s.photo_url ? "cursor-zoom-in ring-2 ring-gold-400/50 hover:ring-gold-500" : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={displayName(s.profiles?.full_name) || "Staff"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          displayName(s.profiles?.full_name || "S")
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        )}
                      </button>
                      <Link href={`/staff/${s.id}`} className="font-semibold text-ink-700 hover:text-gold-600 hover:underline">
                        {displayName(s.profiles?.full_name)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate/70 font-medium">{s.department || "—"}</td>
                  <td className="px-4 py-3.5 text-slate/70">{s.designation || "—"}</td>
                  <td className="px-4 py-3.5 text-slate/70 font-mono text-xs">{s.mobile_number || "—"}</td>
                  <td className="px-4 py-3.5">
                    {s.is_active ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200/60">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/staff/${s.id}`}>
                        <Button variant="ghost" className="h-8 px-2.5 text-xs">View</Button>
                      </Link>
                      <Link href={`/staff/${s.id}/edit`}>
                        <Button variant="ghost" className="h-8 px-2.5 text-xs">Edit</Button>
                      </Link>
                      <StaffStatusButton id={s.id} name={displayName(s.profiles?.full_name) || "this staff member"} active={s.is_active} />
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-10 w-10 text-slate/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm font-medium text-slate/60">No staff members match this filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-ink-100 bg-white md:hidden">
          {staff.map((s) => (
            <div key={s.id} className="flex min-w-0 flex-col gap-2 p-3.5 transition-colors hover:bg-gold-50/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => s.photo_url && setPreviewUrl(s.photo_url)}
                    className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700"
                  >
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={displayName(s.profiles?.full_name)} className="h-full w-full object-cover" />
                    ) : (
                      displayName(s.profiles?.full_name || "S")
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    )}
                  </button>
                  <div className="min-w-0">
                    <Link href={`/staff/${s.id}`} className="truncate text-sm font-semibold text-ink-700 hover:underline">
                      {displayName(s.profiles?.full_name)}
                    </Link>
                    <p className="text-xs font-mono text-slate/60">{s.employee_id}</p>
                  </div>
                </div>
                {s.is_active ? (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate/70 pt-1">
                <span>{s.department || "No department"} · {s.designation || "No designation"}</span>
                <div className="flex items-center gap-1.5">
                  <Link href={`/staff/${s.id}/edit`}>
                    <Button variant="ghost" className="h-7 px-2 text-xs">Edit</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate/50">No staff members match this view.</p>
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink-900/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[92vw] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close image preview"
              onClick={() => setPreviewUrl(null)}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink-900/75 text-lg text-white transition hover:bg-ink-900"
            >
              ×
            </button>
            <img src={previewUrl} alt="Staff profile preview" className="max-h-[86vh] max-w-[88vw] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
