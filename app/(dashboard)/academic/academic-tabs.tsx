"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import {
  createClassRow,
  updateClassRow,
  createSectionRow,
  createSectionsForClasses,
  createSession,
  deleteClassRow,
  deleteSectionRow,
  updateSectionsName,
  deleteSession,
  setCurrentSession,
  createDepartment,
  deleteDepartment,
  createDesignation,
  deleteDesignation,
} from "./actions";
import { callServerAction } from "@/lib/client-action";
import { SchoolContextSelector } from "./school-context-selector";
import type { MasterSchool } from "@/lib/security/master-data-context";

type Session = { id: string; name: string; start_date: string; end_date: string; is_current: boolean };
type ClassRow = { id: string; name: string; sort_order: number };
type SectionRow = { id: string; name: string; class_id: string; classes: { name: string } | null };
type MasterRow = { id: string; name: string };

function formatSessionDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function AcademicTabs({
  sessions,
  classes,
  sections,
  departments = [],
  designations = [],
  schools,
  organizationId,
  schoolId,
  loginScope,
  showSchoolSelector = true,
}: {
  sessions: Session[];
  classes: ClassRow[];
  sections: SectionRow[];
  departments?: MasterRow[];
  designations?: MasterRow[];
  schools: MasterSchool[];
  organizationId: string | null;
  schoolId: string | null;
  loginScope: "school" | "organization" | "super_admin" | null;
  showSchoolSelector?: boolean;
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
      {showSchoolSelector && <SchoolContextSelector schools={schools} organizationId={organizationId} schoolId={schoolId} loginScope={loginScope} />}
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {(["sessions", "classes", "sections", "departments", "designations"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`min-h-10 rounded-lg px-3.5 py-2 text-xs font-bold capitalize transition sm:px-5 sm:text-sm ${
                tab === t ? "bg-ink-700 text-white shadow-sm" : "text-slate/65 hover:bg-ink-50 hover:text-ink-700"
              }`}
            >
              {t === "sessions" ? "Academic Sessions" : t}
            </button>
          ))}
        </div>
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
      const res = await callServerAction(() => createSession(form));
      const error = res?.error ?? (res === undefined ? "No response from server" : null);
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
      const res = await callServerAction(() => deleteSession(deleteId));
      setDeleteId(null);
      const error = res?.error ?? (res === undefined ? "No response from server" : null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Academic session deleted");
    });
  }
  function makeCurrent(id: string) {
    startTransition(async () => { const res = await callServerAction(() => setCurrentSession(id)); const error = res?.error ?? (res === undefined ? "No response from server" : null); if (error) push(error, "error"); else push("Current session updated"); });
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
                  {formatSessionDate(s.start_date)} → {formatSessionDate(s.end_date)}
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", sort_order: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", sort_order: 0 });

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

  function startEdit(c: ClassRow) {
    setEditingId(c.id);
    setEditForm({ name: c.name, sort_order: c.sort_order });
  }

  function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    startTransition(async () => {
      const { error } = await updateClassRow(editingId, editForm);
      if (error) {
        push(error, "error");
        return;
      }
      setEditingId(null);
      push("Class updated");
      router.refresh();
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
                {editingId === c.id ? (
                  <td colSpan={3} className="py-3">
                    <form onSubmit={handleUpdate} className="grid gap-2 sm:grid-cols-[1fr_140px_auto_auto]">
                      <Input aria-label="Class name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      <Input aria-label="Sort order" type="number" required value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} />
                      <Button type="submit" disabled={pending}>Save</Button>
                      <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditingId(null)}>Cancel</Button>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-3 font-mono">{c.name}</td>
                    <td className="py-3 text-slate/70">{c.sort_order}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" disabled={pending} onClick={() => startEdit(c)}>Edit</Button>
                      <Button variant="ghost" disabled={pending} onClick={() => setDeleteId(c.id)}>Delete</Button>
                    </td>
                  </>
                )}
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
  const [form, setForm] = useState({ class_ids: [] as string[], name: "" });
  const [classSearch, setClassSearch] = useState("");
  const classDropdownRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeClassDropdown(event: MouseEvent) {
      if (!classDropdownRef.current?.contains(event.target as Node)) {
        classDropdownRef.current?.removeAttribute("open");
      }
    }
    document.addEventListener("click", closeClassDropdown);
    return () => document.removeEventListener("click", closeClassDropdown);
  }, []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  const groupedSections = Array.from(
    sections.reduce((groups, section) => {
      const classKey = section.class_id;
      const group = groups.get(classKey) ?? { classId: classKey, name: section.classes?.name ?? "", ids: [] as string[], sections: [] as { id: string; name: string }[] };
      group.ids.push(section.id);
      group.sections.push({ id: section.id, name: section.name });
      groups.set(classKey, group);
      return groups;
    }, new Map<string, { classId: string; name: string; ids: string[]; sections: { id: string; name: string }[] }>()).values(),
  ).sort((a, b) => {
    const orderA = classes.find((c) => c.id === a.classId)?.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = classes.find((c) => c.id === b.classId)?.sort_order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (form.class_ids.length === 0) return;
    startTransition(async () => {
      const { error } = await createSectionsForClasses({ class_ids: form.class_ids, name: form.name });
      if (error) {
        push(error, "error");
        return;
      }
      push("Section created");
      setForm({ class_ids: form.class_ids, name: "" });
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

  function handleSectionUpdate(ids: string[]) {
    startTransition(async () => {
      const { error } = await updateSectionsName(ids, editingSectionName);
      if (error) push(error, "error");
      else { setEditingSectionId(null); push("Section updated"); }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New section</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sec-class">Classes</Label>
            <details ref={classDropdownRef} className="relative mt-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm">
                <span>{form.class_ids.length ? `${form.class_ids.length} class${form.class_ids.length > 1 ? "es" : ""} selected` : "Select classes"}</span>
                <span aria-hidden="true">▾</span>
              </summary>
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-ink-100 bg-white p-2 shadow-lg">
                <Input
                  aria-label="Search classes"
                  placeholder="Search classes..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="mb-2"
                />
                {classes.filter((c) => c.name.toLowerCase().includes(classSearch.toLowerCase())).map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-ink-50">
                    <input
                      type="checkbox"
                      checked={form.class_ids.includes(c.id)}
                      onChange={(e) => setForm({ ...form, class_ids: e.target.checked ? [...form.class_ids, c.id] : form.class_ids.filter((id) => id !== c.id) })}
                    />
                    {c.name}
                  </label>
                ))}
                {classes.filter((c) => c.name.toLowerCase().includes(classSearch.toLowerCase())).length === 0 && (
                  <p className="px-2 py-2 text-xs text-slate/60">No classes found.</p>
                )}
              </div>
            </details>
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
            {groupedSections.map((s) => (
              <tr key={s.ids[0]} className="border-b border-ink-100 last:border-0">
                {editingSectionId && s.sections.some((section) => section.id === editingSectionId) ? <td colSpan={3} className="py-3"><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSectionUpdate([editingSectionId]); }}><Input required value={editingSectionName} onChange={(e) => setEditingSectionName(e.target.value)} /><Button type="submit" disabled={pending}>Save</Button><Button type="button" variant="ghost" onClick={() => setEditingSectionId(null)}>Cancel</Button></form></td> : <><td className="py-3">{s.name}</td>
                <td className="py-3 font-mono"><div className="flex flex-wrap gap-1">{s.sections.map((section) => <span key={section.id} className="inline-flex items-center gap-0.5">{section.name}<Button className="h-7 w-7 p-0" variant="ghost" aria-label={`Edit section ${section.name}`} title={`Edit section ${section.name}`} disabled={pending} onClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name); }}>✎</Button></span>)}</div></td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setDeleteId(s.ids[0])}>
                    Delete
                  </Button>
                </td>
                </>}
              </tr>
            ))}
            {groupedSections.length === 0 && (
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
