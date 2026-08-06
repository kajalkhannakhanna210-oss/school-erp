"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";

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

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
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
              <td className="px-4 py-3 font-mono">{s.employee_id}</td>
              <td className="px-4 py-3">
                <div className="flex w-full items-center gap-2">
                  <Link href={`/staff/${s.id}`} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                    {s.photo_url ? <img src={s.photo_url} alt={s.profiles?.full_name || "Staff"} className="h-full w-full object-cover" /> : (s.profiles?.full_name ?? "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                  </Link>
                  <Link href={`/staff/${s.id}`} className="min-w-0 flex-1 truncate font-medium text-ink-700 hover:underline">{s.profiles?.full_name}</Link>
                  <Link href={`/staff/${s.id}/edit`}><Button variant="ghost">Edit</Button></Link>
                </div>
              </td>
              <td className="px-4 py-3 text-slate/70">{s.department}</td>
              <td className="px-4 py-3 text-slate/70">{s.designation}</td>
              <td className="px-4 py-3 text-slate/70">{s.mobile_number}</td>
              <td className="px-4 py-3">{!s.is_active && <Badge>Archived</Badge>}</td>
              <td className="px-4 py-3 text-right" />
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate/50">
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
                  {s.photo_url ? <img src={s.photo_url} alt={s.profiles?.full_name || "Staff"} className="h-full w-full object-cover" /> : (s.profiles?.full_name ?? "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </Link>
                <Link href={`/staff/${s.id}`} className="min-w-0 flex-1 truncate font-semibold text-ink-700 hover:underline">
                  {s.profiles?.full_name}
                </Link>
                <Link href={`/staff/${s.id}/edit`} aria-label={`Edit ${s.profiles?.full_name || "staff member"}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-100 text-ink-600 hover:bg-ink-50"><span aria-hidden="true" className="text-base font-bold">✎</span></Link>
                <p className="basis-full truncate text-xs text-slate/70"><span className="font-mono">{s.employee_id}</span><span className="mx-1.5 text-slate/40">·</span>{s.mobile_number || "No mobile number"}</p>
              </div>
              {!s.is_active && <Badge>Archived</Badge>}
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
  );
}
