"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { setStaffActive } from "./actions";

export type StaffRow = {
  id: string;
  employee_id: string;
  department: string | null;
  designation: string | null;
  mobile_number: string | null;
  is_active: boolean;
  profiles: { full_name: string } | null;
};

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<StaffRow | null>(null);

  function handleArchive() {
    if (!archiveTarget) return;
    const next = !archiveTarget.is_active;
    startTransition(async () => {
      const { error } = await setStaffActive(archiveTarget.id, next);
      setArchiveTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push(next ? "Staff member restored" : "Staff member archived");
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="w-full text-sm">
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
            <tr key={s.id} className="border-b border-ink-100 last:border-0">
              <td className="px-4 py-3 font-mono">{s.employee_id}</td>
              <td className="px-4 py-3">
                <Link href={`/staff/${s.id}`} className="font-medium text-ink-700 hover:underline">
                  {s.profiles?.full_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate/70">{s.department}</td>
              <td className="px-4 py-3 text-slate/70">{s.designation}</td>
              <td className="px-4 py-3 text-slate/70">{s.mobile_number}</td>
              <td className="px-4 py-3">{!s.is_active && <Badge>Archived</Badge>}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" onClick={() => setArchiveTarget(s)} disabled={pending}>
                  {s.is_active ? "Archive" : "Restore"}
                </Button>
              </td>
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
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.is_active ? "Archive staff member?" : "Restore staff member?"}
        description={
          archiveTarget?.is_active
            ? "Archiving removes them from class-teacher eligibility and the active roster. Their record is kept."
            : "This staff member will reappear in the active roster and become eligible for class-teacher assignment again."
        }
        confirmLabel={archiveTarget?.is_active ? "Archive" : "Restore"}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
