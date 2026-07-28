"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { assignClassTeacher, removeClassTeacher } from "./actions";

type Option = { id: string; name: string };
type Assignment = {
  id: string;
  classes: { name: string } | null;
  sections: { name: string } | null;
  academic_sessions: { name: string } | null;
  profiles: { full_name: string } | null;
};

export function AssignForm({
  classes,
  sections,
  sessions,
  staff,
  assignments,
}: {
  classes: Option[];
  sections: (Option & { class_id: string })[];
  sessions: Option[];
  staff: Option[];
  assignments: Assignment[];
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ class_id: "", section_id: "", session_id: "", staff_id: "" });
  const [removeId, setRemoveId] = useState<string | null>(null);

  const filteredSections = sections.filter((s) => s.class_id === form.class_id);

  function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!form.class_id || !form.section_id || !form.session_id || !form.staff_id) return;
    startTransition(async () => {
      const { error } = await assignClassTeacher(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Class teacher assigned");
    });
  }

  function handleRemove() {
    if (!removeId) return;
    startTransition(async () => {
      const { error } = await removeClassTeacher(removeId);
      setRemoveId(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Assignment removed");
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New assignment</h2>
        <form onSubmit={handleAssign} className="mt-4 space-y-4 text-sm">
          <select
            className="w-full rounded-md border border-ink-100 px-3 py-2"
            required
            value={form.class_id}
            onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: "" })}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-ink-100 px-3 py-2"
            required
            value={form.section_id}
            onChange={(e) => setForm({ ...form, section_id: e.target.value })}
            disabled={!form.class_id}
          >
            <option value="">Select section</option>
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-ink-100 px-3 py-2"
            required
            value={form.session_id}
            onChange={(e) => setForm({ ...form, session_id: e.target.value })}
          >
            <option value="">Select session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-ink-100 px-3 py-2"
            required
            value={form.staff_id}
            onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
          >
            <option value="">Select staff member</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={pending} className="w-full">
            Assign
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Class / Section</th>
              <th className="pb-2">Session</th>
              <th className="pb-2">Teacher</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3 font-mono">
                  {a.classes?.name} - {a.sections?.name}
                </td>
                <td className="py-3 text-slate/70">{a.academic_sessions?.name}</td>
                <td className="py-3">{a.profiles?.full_name}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setRemoveId(a.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate/50">
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!removeId}
        title="Remove class teacher?"
        description="This section will be unassigned until a new teacher is picked."
        onConfirm={handleRemove}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}
