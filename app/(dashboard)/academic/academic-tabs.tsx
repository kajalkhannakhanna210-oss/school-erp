"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
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
type ClassRow = { id: string; name: string; sort_order: number; wing_id?: string | null };
type WingRow = { id: string; wing_name: string; wing_code: string; is_active: boolean };
type SectionRow = { id: string; name: string; class_id: string; classes: { name: string } | null };
type MasterRow = { id: string; name: string };

function formatSessionDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

const calendarMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const calendarWeekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarDatePicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const selected = toDateParts(value);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const today = new Date();
  const todayValue = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !calendarRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function chooseDate(day: number) {
    onChange(toIsoDate(view.year, view.month, day));
  }

  function chooseToday() {
    onChange(todayValue);
    setView({ year: today.getFullYear(), month: today.getMonth() });
  }

  function toggleCalendar() {
    const next = toDateParts(value);
    setView({ year: next.year, month: next.month });
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = 390;
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const top = Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - estimatedHeight - 8));
      setPosition({ top, left, width });
    }
    setOpen((current) => !current);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor={`${id}-trigger`}>{label}</Label>
      <button
        id={`${id}-trigger`}
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleCalendar}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ink-200 ${value ? "border-ink-200 text-ink-700" : "border-ink-100 text-slate/45"}`}
      >
        <span>{value ? formatSessionDate(value) : "Select date"}</span>
        <span aria-hidden="true" className="text-base text-ink-700">⌄</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={calendarRef} role="dialog" aria-label={`${label} calendar`} style={{ top: position.top, left: position.left, width: position.width }} className="fixed z-[100] max-h-[calc(100vh-1rem)] min-w-[19rem] overflow-y-auto rounded-2xl border border-ink-100 bg-white p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Month"
              value={view.month}
              onChange={(event) => setView({ ...view, month: Number(event.target.value) })}
              className="h-12 rounded-xl border border-ink-100 bg-white px-3 text-sm font-semibold text-ink-700 outline-none focus:border-ink-300"
            >
              {calendarMonths.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
            <select
              aria-label="Year"
              value={view.year}
              onChange={(event) => setView({ ...view, year: Number(event.target.value) })}
              className="h-12 rounded-xl border border-ink-100 bg-white px-3 text-sm font-semibold text-ink-700 outline-none focus:border-ink-300"
            >
              {Array.from({ length: 21 }, (_, index) => today.getFullYear() - 10 + index).map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-slate/55">
            {calendarWeekdays.map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dateValue = toIsoDate(view.year, view.month, day);
              const isSelected = value === dateValue;
              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => chooseDate(day)}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm transition ${isSelected ? "bg-ink-700 font-bold text-white" : "text-ink-700 hover:bg-ink-50"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
            <button type="button" onClick={chooseToday} className="text-sm text-slate hover:text-ink-700">Today</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 shadow-sm hover:bg-ink-50">Done</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function AcademicTabs({
  sessions,
  classes,
  sections,
  wings = [],
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
  wings?: WingRow[];
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
        {tab === "classes" && <ClassesTab classes={classes} wings={wings} />}
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
    if (!form.start_date) {
      push("Start date is required", "error");
      return;
    }
    if (!form.end_date) {
      push("End date is required", "error");
      return;
    }
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
        <h2 className="-mx-4 -mt-4 mb-4 rounded-t-xl bg-ink-700 px-4 py-3 font-display text-lg text-white sm:-mx-6 sm:-mt-6 sm:px-6">New session</h2>
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
            <CalendarDatePicker id="s-start" label="Start date" value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} />
          </div>
          <div>
            <CalendarDatePicker id="s-end" label="End date" value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} />
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
          <thead className="bg-ink-700 text-white">
            <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wide text-white/80">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Dates</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"></th>
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
  return <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Card><h2 className="-mx-4 -mt-4 mb-4 rounded-t-xl bg-ink-700 px-4 py-3 font-display text-lg text-white sm:-mx-6 sm:-mt-6 sm:px-6">New {title.toLowerCase()}</h2><form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { const { error } = await create(name); if (error) push(error, "error"); else { setName(""); push(`${title} created`); } }); }}><div><Label htmlFor={`new-${title}`}>Name</Label><Input id={`new-${title}`} required value={name} onChange={(e) => setName(e.target.value)} /></div><Button className="w-full" disabled={pending}>Add {title}</Button></form></Card><Card><table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-ink-100 last:border-0"><td className="py-3">{row.name}</td><td className="py-3 text-right"><Button variant="ghost" disabled={pending} onClick={() => startTransition(async () => { const { error } = await remove(row.id); if (error) push(error, "error"); else push(`${title} deleted`); })}>Delete</Button></td></tr>)}{rows.length === 0 && <tr><td className="py-6 text-center text-slate/50">No {title.toLowerCase()}s yet.</td></tr>}</tbody></table></Card></div>;
}

function SearchableWingSelect({ wings, value, onChange }: { wings: WingRow[]; value: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const activeWings = wings.filter((wing) => wing.is_active);
  const selected = activeWings.find((wing) => wing.id === value) ?? wings.find((wing) => wing.id === value);
  const filtered = activeWings.filter((wing) => `${wing.wing_code} ${wing.wing_name}`.toLowerCase().includes(query.toLowerCase()));
  return <details className="relative mt-1 group">
    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700"><span className="truncate">{selected ? `${selected.wing_code} — ${selected.wing_name}` : "Select wing"}</span><span className="ml-2 text-xs text-slate/50">⌄</span></summary>
    <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-ink-100 bg-white p-2 shadow-xl"><Input aria-label="Search wings" placeholder="Search wings" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-0" />{filtered.map((wing) => <button type="button" key={wing.id} className="block w-full rounded px-2 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50" onClick={(event) => { onChange(wing.id); (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); }}>{wing.wing_code} — {wing.wing_name}</button>)}{filtered.length === 0 && <p className="px-2 py-2 text-xs text-slate/50">No active wings found.</p>}</div>
  </details>;
}

function ClassesTab({ classes, wings }: { classes: ClassRow[]; wings: WingRow[] }) {
  const { push } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", sort_order: 0, wing_id: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", sort_order: 0, wing_id: "" });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.wing_id) {
      push("Wing is required", "error");
      return;
    }
    startTransition(async () => {
      const { error } = await createClassRow(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Class created");
      setForm({ name: "", sort_order: 0, wing_id: "" });
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
    setEditForm({ name: c.name, sort_order: c.sort_order, wing_id: c.wing_id ?? "" });
  }

  function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.wing_id) {
      push("Wing is required", "error");
      return;
    }
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
        <h2 className="-mx-4 -mt-4 mb-4 rounded-t-xl bg-ink-700 px-4 py-3 font-display text-lg text-white sm:-mx-6 sm:-mt-6 sm:px-6">New class</h2>
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
          <div><Label htmlFor="c-wing">Wing <span className="text-red-600">*</span></Label><SearchableWingSelect wings={wings} value={form.wing_id} onChange={(wing_id) => setForm({ ...form, wing_id })} /></div>
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
        <div className="grid gap-4 md:hidden">
          {classes.map((c) => (
            <article key={c.id} className="rounded-2xl border border-ink-100 border-l-4 border-l-emerald-500 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
              {editingId === c.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <Input aria-label="Class name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <SearchableWingSelect wings={wings} value={editForm.wing_id} onChange={(wing_id) => setEditForm({ ...editForm, wing_id })} />
                  <Input aria-label="Sort order" type="number" required value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={pending} className="flex-1">Save</Button>
                    <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditingId(null)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate/55">Class</p>
                      <h3 className="mt-1 truncate font-display text-base font-semibold text-ink-700">{c.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-medium text-slate/70">Order {c.sort_order}</span>
                      <span className="mt-1 block max-w-[9rem] truncate text-sm font-semibold text-ink-700">{wings.find((wing) => wing.id === c.wing_id)?.wing_name ?? "No wing"}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2 border-t border-ink-100 pt-2">
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`} title={`Edit ${c.name}`} className="h-9 w-9 p-0">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => setDeleteId(c.id)} aria-label={`Delete ${c.name}`} title={`Delete ${c.name}`} className="h-9 w-9 p-0 text-rose-600 hover:text-rose-700">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>
                    </Button>
                  </div>
                </>
              )}
            </article>
          ))}
          {classes.length === 0 && <p className="py-6 text-center text-sm text-slate/50">No classes yet.</p>}
        </div>
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-ink-700 text-white">
            <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wide text-white/80">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Wing</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-ink-100 last:border-0">
                {editingId === c.id ? (
                  <td colSpan={4} className="py-3">
                    <form onSubmit={handleUpdate} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto_auto]">
                      <Input aria-label="Class name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      <Input aria-label="Sort order" type="number" required value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} />
                      <SearchableWingSelect wings={wings} value={editForm.wing_id} onChange={(wing_id) => setEditForm({ ...editForm, wing_id })} />
                      <Button type="submit" disabled={pending}>Save</Button>
                      <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditingId(null)}>Cancel</Button>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-3 font-mono">{c.name}</td>
                    <td className="py-3 text-slate/70">{c.sort_order}</td>
                    <td className="py-3 text-slate/70">{wings.find((wing) => wing.id === c.wing_id)?.wing_name ?? "—"}</td>
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
  const classPanelRef = useRef<HTMLDivElement>(null);
  const classTriggerRef = useRef<HTMLElement>(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [classPanelPosition, setClassPanelPosition] = useState({ top: 0, left: 0, width: 320, bottom: undefined as number | undefined, right: undefined as number | undefined });

  useEffect(() => {
    function closeClassDropdown(event: MouseEvent) {
      if (!classDropdownRef.current?.contains(event.target as Node) && !classPanelRef.current?.contains(event.target as Node)) {
        classDropdownRef.current?.removeAttribute("open");
        setClassDropdownOpen(false);
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
        <h2 className="-mx-4 -mt-4 mb-4 rounded-t-xl bg-ink-700 px-4 py-3 font-display text-lg text-white sm:-mx-6 sm:-mt-6 sm:px-6">New section</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sec-class">Classes</Label>
            <details ref={classDropdownRef} className="relative mt-1" onToggle={(event) => setClassDropdownOpen(event.currentTarget.open)}>
              <summary ref={classTriggerRef} onClick={() => {
                const rect = classTriggerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const mobile = window.innerWidth < 640;
                setClassPanelPosition(mobile
                  ? { top: 12, left: 12, width: window.innerWidth - 24, bottom: 12, right: 12 }
                  : { top: rect.bottom + 4, left: rect.left, width: rect.width, bottom: undefined, right: undefined });
              }} className="flex cursor-pointer list-none items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm">
                <span>{form.class_ids.length ? `${form.class_ids.length} class${form.class_ids.length > 1 ? "es" : ""} selected` : "Select classes"}</span>
                <span aria-hidden="true">▾</span>
              </summary>
              {classDropdownOpen && typeof document !== "undefined" && createPortal(<div ref={classPanelRef} style={classPanelPosition} className="fixed z-[100] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-ink-100 bg-white p-4 shadow-2xl sm:max-h-52 sm:rounded-md sm:p-2 sm:shadow-lg">
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
              </div>, document.body)}
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
          <thead className="bg-ink-700 text-white">
            <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wide text-white/80">
              <th className="px-3 py-3">Class</th>
              <th className="px-3 py-3">Section</th>
              <th className="px-3 py-3"></th>
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
