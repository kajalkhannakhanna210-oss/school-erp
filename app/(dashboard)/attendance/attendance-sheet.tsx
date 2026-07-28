"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { resubmitAttendance, submitAttendance, unlockAttendance } from "./actions";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "On Leave" },
] as const;

type StudentRow = { id: string; admission_number: string; full_name: string };

export function AttendanceSheet({
  students,
  batch,
  existingStatuses,
  classId,
  sectionId,
  sessionId,
  date,
  label,
  canOverride,
}: {
  students: StudentRow[];
  batch: { id: string; is_locked: boolean } | null;
  existingStatuses: Record<string, string>;
  classId: string;
  sectionId: string;
  sessionId: string;
  date: string;
  label: string;
  canOverride: boolean;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of students) initial[s.id] = existingStatuses[s.id] ?? "present";
    return initial;
  });
  const [unlockOpen, setUnlockOpen] = useState(false);

  const readOnly = batch?.is_locked ?? false;

  function handleSubmit() {
    const records = students.map((s) => ({ student_id: s.id, status: statuses[s.id] }));
    startTransition(async () => {
      const result = batch
        ? await resubmitAttendance(batch.id, records)
        : await submitAttendance({
            class_id: classId,
            section_id: sectionId,
            session_id: sessionId,
            attendance_date: date,
            records,
          });
      if (result.error) {
        push(result.error, "error");
        return;
      }
      push("Attendance submitted and locked");
    });
  }

  function handleUnlock() {
    if (!batch) return;
    startTransition(async () => {
      const { error } = await unlockAttendance(batch.id, label);
      setUnlockOpen(false);
      if (error) {
        push(error, "error");
        return;
      }
      push("Attendance unlocked for editing");
    });
  }

  if (students.length === 0) {
    return <p className="text-sm text-slate/50">No active students in this class and section.</p>;
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink-700">{label}</h2>
        {readOnly && (
          <div className="flex items-center gap-3">
            <Badge>Locked</Badge>
            {canOverride && (
              <Button variant="ghost" onClick={() => setUnlockOpen(true)}>
                Unlock to edit
              </Button>
            )}
          </div>
        )}
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
            <th className="py-2">Admission No</th>
            <th className="py-2">Name</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-ink-100 last:border-0">
              <td className="py-2 font-mono">{s.admission_number}</td>
              <td className="py-2">{s.full_name}</td>
              <td className="py-2">
                {readOnly ? (
                  STATUSES.find((st) => st.value === statuses[s.id])?.label ?? statuses[s.id]
                ) : (
                  <div className="flex gap-3">
                    {STATUSES.map((st) => (
                      <label key={st.value} className="flex items-center gap-1 text-xs text-slate">
                        <input
                          type="radio"
                          name={`status-${s.id}`}
                          checked={statuses[s.id] === st.value}
                          onChange={() => setStatuses((prev) => ({ ...prev, [s.id]: st.value }))}
                        />
                        {st.label}
                      </label>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={pending} className="mt-4">
          {pending ? "Submitting…" : "Submit attendance"}
        </Button>
      )}

      <ConfirmDialog
        open={unlockOpen}
        title="Unlock this date for editing?"
        description="This is logged as a Super Admin override. The class teacher (or you) can then correct entries and resubmit, which re-locks it."
        confirmLabel="Unlock"
        onConfirm={handleUnlock}
        onCancel={() => setUnlockOpen(false)}
      />
    </Card>
  );
}
