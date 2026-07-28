"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { saveMarks } from "../actions";

type Student = { id: string; admission_number: string; full_name: string };
type ExamSubjectColumn = { id: string; subject_name: string; max_marks: number };

export function MarksGrid({
  students,
  columns,
  existingMarks,
  readOnly,
  label,
}: {
  students: Student[];
  columns: ExamSubjectColumn[];
  existingMarks: Record<string, Record<string, number>>;
  readOnly: boolean;
  label: string;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const s of students) {
      init[s.id] = {};
      for (const c of columns) {
        const existing = existingMarks[s.id]?.[c.id];
        init[s.id][c.id] = existing != null ? String(existing) : "";
      }
    }
    return init;
  });

  function updateCell(studentId: string, examSubjectId: string, value: string) {
    setValues((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [examSubjectId]: value } }));
  }

  function handleSave() {
    const entries: { exam_subject_id: string; student_id: string; marks_obtained: string }[] = [];
    for (const s of students) {
      for (const c of columns) {
        const v = values[s.id]?.[c.id];
        if (v !== "" && v != null) {
          entries.push({ exam_subject_id: c.id, student_id: s.id, marks_obtained: v });
        }
      }
    }
    startTransition(async () => {
      const { error } = await saveMarks(entries);
      if (error) {
        push(error, "error");
        return;
      }
      push("Marks saved");
    });
  }

  if (columns.length === 0) {
    return (
      <p className="text-sm text-slate/50">
        This exam has no subjects configured for this class yet — add them in the Structure tab.
      </p>
    );
  }

  if (students.length === 0) {
    return <p className="text-sm text-slate/50">No active students in this class and section.</p>;
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink-700">{label}</h2>
        {readOnly && <Badge>Published — read only</Badge>}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="py-2 pr-4">Student</th>
              {columns.map((c) => (
                <th key={c.id} className="py-2 pr-4">
                  {c.subject_name} <span className="text-slate/30">/{c.max_marks}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-ink-100 last:border-0">
                <td className="py-2 pr-4">
                  <span className="font-mono">{s.admission_number}</span> {s.full_name}
                </td>
                {columns.map((c) => (
                  <td key={c.id} className="py-2 pr-4">
                    <Input
                      type="number"
                      min="0"
                      max={c.max_marks}
                      disabled={readOnly}
                      value={values[s.id]?.[c.id] ?? ""}
                      onChange={(e) => updateCell(s.id, c.id, e.target.value)}
                      className="mt-0 w-20"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button onClick={handleSave} disabled={pending} className="mt-4">
          {pending ? "Saving…" : "Save marks"}
        </Button>
      )}
    </Card>
  );
}
