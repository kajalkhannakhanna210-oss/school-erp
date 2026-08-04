"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { setStudentActive } from "./actions";

export type StudentRow = {
  id: string;
  admission_number: string;
  roll_number: string | null;
  mobile_number: string | null;
  is_active: boolean;
  profiles: { full_name: string } | null;
  classes: { name: string } | null;
  sections: { name: string } | null;
};

export function StudentTable({ students, canManage }: { students: StudentRow[]; canManage: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<StudentRow | null>(null);

  function handleArchive() {
    if (!archiveTarget) return;
    const next = !archiveTarget.is_active;
    startTransition(async () => {
      const { error } = await setStudentActive(archiveTarget.id, next);
      setArchiveTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push(next ? "Student restored" : "Student archived");
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/70 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate/60">
            <th className="px-4 py-3">Admission No</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Class / Section</th>
            <th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-ink-100 transition hover:bg-gold-50/30 last:border-0">
              <td className="px-4 py-3 font-mono">{s.admission_number}</td>
              <td className="px-4 py-3">
                <Link href={`/students/${s.id}`} className="flex items-center gap-3 font-semibold text-ink-700 hover:text-gold-600">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">{(s.profiles?.full_name ?? "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="truncate">{s.profiles?.full_name}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-slate/70">
                {s.classes?.name} {s.sections?.name && `- ${s.sections.name}`}
              </td>
              <td className="px-4 py-3 text-slate/70">{s.mobile_number}</td>
              <td className="px-4 py-3">{s.is_active ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span> : <Badge>Archived</Badge>}</td>
              <td className="px-4 py-3 text-right">
                {canManage && (
                  <div className="flex justify-end gap-1">
                    <Link href={`/students/${s.id}/edit`}><Button variant="ghost">Edit</Button></Link>
                    <Button variant="ghost" onClick={() => setArchiveTarget(s)} disabled={pending}>
                      {s.is_active ? "Archive" : "Restore"}
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate/50">
                No students match this view.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.is_active ? "Archive student?" : "Restore student?"}
        description={
          archiveTarget?.is_active
            ? "Archived students are hidden from the active roster but their fee and attendance history is kept."
            : "This student will reappear in the active roster."
        }
        confirmLabel={archiveTarget?.is_active ? "Archive" : "Restore"}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
