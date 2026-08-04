"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import {
  createClassRow,
  createSectionRow,
  createSession,
  deleteClassRow,
  deleteSectionRow,
  deleteSession,
  setCurrentSession,
  createDepartment,
  deleteDepartment,
  createDesignation,
  deleteDesignation,
} from "./actions";

type Session = { id: string; name: string; start_date: string; end_date: string; is_current: boolean };
type ClassRow = { id: string; name: string; sort_order: number };
type SectionRow = { id: string; name: string; class_id: string; classes: { name: string } | null };
type MasterRow = { id: string; name: string };

export function AcademicTabs({
  sessions,
  classes,
  sections,
  departments = [],
  designations = [],
}: {
  sessions: Session[];
  classes: ClassRow[];
  sections: SectionRow[];
  departments?: MasterRow[];
  designations?: MasterRow[];
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get("tab");
  const selectedTab = ["classes", "sections", "departments", "designations"].includes(requestedTab ?? "") ? requestedTab as "classes" | "sections" | "departments" | "designations" : "sessions";
  const [tab, setTab] = useState<"sessions" | "classes" | "sections" | "departments" | "designations">(selectedTab);

  useEffect(() => {
    setTab(selectedTab);
  }, [selectedTab]);

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-ink-100">
        {(["sessions", "classes", "sections", "departments", "designations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-gold text-ink-700" : "text-slate/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "sessions" && <SessionsTab sessions={sessions} />}
        {tab === "classes" && <ClassesTab classes={classes} />}
        {tab === "sections" && <SectionsTab sections={sections} classes={classes} />}
        {tab === "departments" && <NamedMasterTab title="Department" rows={departments} create={createDepartment} remove={deleteDepartment} />}
        {tab === "designations" && <NamedMasterTab title="Designation" rows={designations} create={createDesignation} remove={deleteDesignation} />}
      </div>
    </div>
  );
}

function SessionsTab({ sessions }: { sessions: Session[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_current: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createSession(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Academic session created");
      setForm({ name: "", start_date: "", end_date: "", is_current: false });
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const { error } = await deleteSession(deleteId);
      setDeleteId(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Academic session deleted");
    });
  }
  function makeCurrent(id: string) {
    startTransition(async () => { const { error } = await setCurrentSession(id); if (error) push(error, "error"); else push("Current session updated"); });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New session</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="s-name">Name</Label>
            <Input
              id="s-name"
              required
              placeholder="2026-2027"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="s-start">Start date</Label>
            <Input
              id="s-start"
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="s-end">End date</Label>
            <Input
              id="s-end"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
            />
            Set as current session
          </label>
          <Button type="submit" disabled={pending} className="w-full">
            Add session
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Name</th>
              <th className="pb-2">Dates</th>
              <th className="pb-2">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3 font-mono">{s.name}</td>
                <td className="py-3 text-slate/70">
                  {s.start_date} → {s.end_date}
                </td>
                <td className="py-3">{s.is_current ? <Badge>Current</Badge> : <Button variant="ghost" disabled={pending} onClick={() => makeCurrent(s.id)}>Set current</Button>}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setDeleteId(s.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate/50">
                  No sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!deleteId}
        title="Delete academic session?"
        description="This removes the session. Classes and sections themselves are unaffected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function NamedMasterTab({ title, rows, create, remove }: { title: string; rows: MasterRow[]; create: (name: string) => Promise<{ error: string | null }>; remove: (id: string) => Promise<{ error: string | null }> }) {
  const { push } = useToast(); const [name, setName] = useState(""); const [pending, startTransition] = useTransition();
  return <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Card><h2 className="font-display text-lg text-ink-700">New {title.toLowerCase()}</h2><form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { const { error } = await create(name); if (error) push(error, "error"); else { setName(""); push(`${title} created`); } }); }}><div><Label htmlFor={`new-${title}`}>Name</Label><Input id={`new-${title}`} required value={name} onChange={(e) => setName(e.target.value)} /></div><Button className="w-full" disabled={pending}>Add {title}</Button></form></Card><Card><table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-ink-100 last:border-0"><td className="py-3">{row.name}</td><td className="py-3 text-right"><Button variant="ghost" disabled={pending} onClick={() => startTransition(async () => { const { error } = await remove(row.id); if (error) push(error, "error"); else push(`${title} deleted`); })}>Delete</Button></td></tr>)}{rows.length === 0 && <tr><td className="py-6 text-center text-slate/50">No {title.toLowerCase()}s yet.</td></tr>}</tbody></table></Card></div>;
}

function ClassesTab({ classes }: { classes: ClassRow[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", sort_order: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createClassRow(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Class created");
      setForm({ name: "", sort_order: 0 });
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const { error } = await deleteClassRow(deleteId);
      setDeleteId(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Class deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New class</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              required
              placeholder="Class 1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="c-order">Sort order</Label>
            <Input
              id="c-order"
              type="number"
              required
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add class
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Name</th>
              <th className="pb-2">Order</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3 font-mono">{c.name}</td>
                <td className="py-3 text-slate/70">{c.sort_order}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setDeleteId(c.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate/50">
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!deleteId}
        title="Delete class?"
        description="Sections and fee structures under this class should be removed first."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function SectionsTab({ sections, classes }: { sections: SectionRow[]; classes: ClassRow[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ class_id: "", name: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.class_id) return;
    startTransition(async () => {
      const { error } = await createSectionRow(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Section created");
      setForm({ class_id: form.class_id, name: "" });
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const { error } = await deleteSectionRow(deleteId);
      setDeleteId(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Section deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New section</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sec-class">Class</Label>
            <select
              id="sec-class"
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              required
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sec-name">Section name</Label>
            <Input
              id="sec-name"
              required
              placeholder="A"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add section
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Class</th>
              <th className="pb-2">Section</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3">{s.classes?.name}</td>
                <td className="py-3 font-mono">{s.name}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setDeleteId(s.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate/50">
                  No sections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!deleteId}
        title="Delete section?"
        description="Any class-teacher assignment for this section will also be removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
