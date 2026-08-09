"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { promoteStudents } from "../actions";

type Option = { id: string; name: string };

export function PromoteForm({
  classes,
  sections,
  sessions,
  studentCounts,
}: {
  classes: Option[];
  sections: (Option & { class_id: string })[];
  sessions: Option[];
  studentCounts: Record<string, number>;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    from_class_id: "",
    from_section_id: "",
    from_session_id: "",
    to_class_id: "",
    to_section_id: "",
    to_session_id: "",
  });

  const fromSections = sections.filter((s) => s.class_id === form.from_class_id);
  const toSections = sections.filter((s) => s.class_id === form.to_class_id);
  const sourceCount = studentCounts[`${form.from_class_id}:${form.from_section_id}:${form.from_session_id}`] ?? 0;
  const targetCount = studentCounts[`${form.to_class_id}:${form.to_section_id}:${form.to_session_id}`] ?? 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const complete = Object.values(form).every(Boolean);
    if (!complete) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    startTransition(async () => {
      const { error, count } = await promoteStudents(form);
      setConfirmOpen(false);
      if (error) {
        push(error, "error");
        return;
      }
      push(`Promoted ${count} student${count === 1 ? "" : "s"}`);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-ink-700">From</h2>
          <div className="mt-4 space-y-4 text-sm">
            <SelectField
              label="Session"
              value={form.from_session_id}
              onChange={(v) => setForm({ ...form, from_session_id: v })}
              options={sessions}
            />
            <SelectField
              label="Class"
              value={form.from_class_id}
              onChange={(v) => setForm({ ...form, from_class_id: v, from_section_id: "" })}
              options={classes}
            />
            <SelectField
              label="Section"
              value={form.from_section_id}
              onChange={(v) => setForm({ ...form, from_section_id: v })}
              options={fromSections}
              disabled={!form.from_class_id}
            />
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-700">Students to promote: {sourceCount}</p>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg text-ink-700">To</h2>
          <div className="mt-4 space-y-4 text-sm">
            <SelectField
              label="Session"
              value={form.to_session_id}
              onChange={(v) => setForm({ ...form, to_session_id: v })}
              options={sessions}
            />
            <SelectField
              label="Class"
              value={form.to_class_id}
              onChange={(v) => setForm({ ...form, to_class_id: v, to_section_id: "" })}
              options={classes}
            />
            <SelectField
              label="Section"
              value={form.to_section_id}
              onChange={(v) => setForm({ ...form, to_section_id: v })}
              options={toSections}
              disabled={!form.to_class_id}
            />
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-700">Students currently in target section: {targetCount}</p>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <Button type="submit" disabled={pending}>
            Promote students
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Promote this group of students?"
        description="Every active student currently in the 'From' class and section moves to the 'To' class, section, and session."
        confirmLabel="Promote"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-slate/60">{label}</label>
      <select
        className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
        required
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
