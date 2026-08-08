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
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
            <th className="px-4 py-3">Actions</th>
            <th className="px-4 py-3">Employee ID</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Designation</th>
            <th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-b border-ink-100 even:bg-[#dfe7f5] last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/staff/${s.id}/edit`}><Button variant="ghost">Edit</Button></Link>
                  <StaffStatusButton id={s.id} name={displayName(s.profiles?.full_name) || "this staff member"} active={s.is_active} />
                </div>
              </td>
              <td className="px-4 py-3 font-mono">{s.employee_id}</td>
              <td className="px-4 py-3">
                <div className="flex w-full items-center gap-2">
                  <Link href={`/staff/${s.id}`} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                    {s.photo_url ? <img src={s.photo_url} alt={displayName(s.profiles?.full_name) || "Staff"} onClick={(event) => { event.preventDefault(); setPreviewUrl(s.photo_url); }} className="h-full w-full cursor-zoom-in object-cover" /> : displayName(s.profiles?.full_name || "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                  </Link>
                  <Link href={`/staff/${s.id}`} className="min-w-0 flex-1 truncate font-medium text-ink-700 hover:underline">{displayName(s.profiles?.full_name)}</Link>
                </div>
              </td>
              <td className="px-4 py-3 text-slate/70">{s.department}</td>
              <td className="px-4 py-3 text-slate/70">{s.designation}</td>
              <td className="px-4 py-3 text-slate/70">{s.mobile_number}</td>
              <td className="px-4 py-3">
                <Badge className={s.is_active ? "" : "bg-red-100 text-red-700"}>{s.is_active ? "Active" : "Inactive"}</Badge>
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate/50">
                No staff match this view.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="divide-y divide-ink-100 bg-white md:hidden">
        {staff.map((s) => (
          <div key={s.id} className="flex min-w-0 items-center gap-3 px-3 py-3 even:bg-[#dfe7f5]">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Link href={`/staff/${s.id}`} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                  {s.photo_url ? <img src={s.photo_url} alt={displayName(s.profiles?.full_name) || "Staff"} onClick={(event) => { event.preventDefault(); setPreviewUrl(s.photo_url); }} className="h-full w-full cursor-zoom-in object-cover" /> : displayName(s.profiles?.full_name || "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </Link>
                <Link href={`/staff/${s.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink-700 hover:underline">
                  {displayName(s.profiles?.full_name)}
                </Link>
                <Link href={`/staff/${s.id}/edit`} aria-label={`Edit ${s.profiles?.full_name || "staff member"}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-100 text-ink-600 hover:bg-ink-50"><span aria-hidden="true" className="text-base font-bold">✎</span></Link>
                <p className="basis-full flex items-center gap-2 truncate text-xs text-slate/70"><span className="font-mono">{s.employee_id}</span><span className="mx-1.5 text-slate/40">·</span>{s.mobile_number || "No mobile number"}<Badge className={s.is_active ? "" : "bg-red-100 text-red-700"}>{s.is_active ? "Active" : "Inactive"}</Badge></p>
              </div>
              <span className="hidden"><Badge className={s.is_active ? "" : "bg-red-100 text-red-700"}>{s.is_active ? "Active" : "Inactive"}</Badge></span>
            <dl className="hidden">
              <div><dt className="text-slate/50">Department</dt><dd className="mt-0.5 text-slate/80">{s.department || "—"}</dd></div>
              <div><dt className="text-slate/50">Designation</dt><dd className="mt-0.5 text-slate/80">{s.designation || "—"}</dd></div>
            </dl>
            <p className="mt-1 truncate text-xs text-slate/60">{s.department || "No department"}<span className="mx-1.5 text-slate/40">·</span>{s.designation || "No designation"}</p>
            </div>
            <Link
              href={`/staff/${s.id}/edit`}
              aria-label={`Edit ${s.profiles?.full_name || "staff member"}`}
              className="hidden"
            >
              <span aria-hidden="true" className="text-base font-bold">✎</span>
            </Link>
          </div>
        ))}
        {staff.length === 0 && <p className="px-4 py-8 text-center text-slate/50">No staff match this view.</p>}
      </div>
    </div>
    {previewUrl && <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-900/70 p-4" role="dialog" aria-modal="true" onClick={() => setPreviewUrl(null)}>
      <div className="relative max-h-[90vh] max-w-[92vw] rounded-2xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Close image preview" onClick={() => setPreviewUrl(null)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-ink-900/75 text-xl text-white">×</button>
        <img src={previewUrl} alt="Staff profile preview" className="max-h-[86vh] max-w-[88vw] rounded-xl object-contain" />
      </div>
    </div>}
    </>
  );
}
