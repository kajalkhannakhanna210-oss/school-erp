"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Card, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { assignClassTeacher, removeClassTeacher } from "./actions";
import { callServerAction } from "@/lib/client-action";
import { ClassTeacherExports } from "./export-buttons";

type Option = { id: string; name: string };
type StaffOption = Option & { sessionIds: string[] };
type SessionOption = Option & { is_current?: boolean };
export type Assignment = {
  id: string;
  session_id: string;
  staff_id: string;
  photo_url?: string | null;
  classes: { name: string } | null;
  sections: { name: string } | null;
  academic_sessions: { name: string } | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  created_at?: string;
};

const PAGE_SIZE = 5;

export function AssignForm({
  classes,
  sections,
  sessions,
  initialSessionId,
  staff,
  assignments,
  totalSections,
}: {
  classes: Option[];
  sections: (Option & { class_id: string })[];
  sessions: SessionOption[];
  initialSessionId: string;
  staff: StaffOption[];
  assignments: Assignment[];
  totalSections: number;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ class_id: "", section_id: "", staff_id: "" });
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [viewSessionId, setViewSessionId] = useState(initialSessionId);
  const [assignmentSessionId, setAssignmentSessionId] = useState(initialSessionId);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("assigned");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const filteredSections = sections.filter((s) => s.class_id === form.class_id);
  const eligibleStaff = staff.filter((member) => member.sessionIds.includes(assignmentSessionId));
  const sessionAssignments = assignments.filter((assignment) => assignment.session_id === viewSessionId);

  // Improved filtering: handle search, class/section filters correctly and support 'all' status
  const filteredAssignments = sessionAssignments.filter((assignment) => {
    const profile = Array.isArray(assignment.profiles) ? assignment.profiles[0] : assignment.profiles;
    const teacher = profile?.full_name?.toLowerCase() ?? "";
    const matchesSearch = !search.trim() || teacher.includes(search.trim().toLowerCase());
    const matchesClass = !classFilter || assignment.classes?.name === classFilter;
    const matchesSection = !sectionFilter || assignment.sections?.name === sectionFilter;

    if (statusFilter === "all") {
      return matchesSearch && matchesClass && matchesSection;
    }
    // default: 'assigned' — show assigned only
    return matchesSearch && matchesClass && matchesSection;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const visibleAssignments = filteredAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const assignedCount = sessionAssignments.length;
  // compute unassigned sections explicitly for accuracy
  const assignedSectionIds = new Set((sessionAssignments ?? []).map((a) => (a as any).section_id ?? (a as any).sections?.id));
  const unassignedSections = (sections ?? []).filter((s) => !assignedSectionIds.has(s.id));
  const unassignedCount = unassignedSections.length;
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages, viewSessionId]);

  useEffect(() => {
    setViewSessionId(initialSessionId);
    setAssignmentSessionId(initialSessionId);
    setForm((current) => ({ ...current, staff_id: "" }));
    setPage(1);
  }, [initialSessionId]);

  useEffect(() => {
    setPage(1);
  }, [search, classFilter, sectionFilter, statusFilter, viewSessionId]);

  const teacherName = (profile: Assignment["profiles"]) =>
    (Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name) ?? "Unknown teacher";

  function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!form.class_id || !form.section_id || !assignmentSessionId || !form.staff_id) return;
    startTransition(async () => {
      const res = await callServerAction(() => assignClassTeacher({ ...form, session_id: assignmentSessionId }));
      const error = res?.error ?? (res === undefined ? "No response from server" : null);
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
      const res = await callServerAction(() => removeClassTeacher(removeId));
      setRemoveId(null);
      const error = res?.error ?? (res === undefined ? "No response from server" : null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Assignment removed");
    });
  }

  function resetFilters() {
    setSearch("");
    setClassFilter("");
    setSectionFilter("");
    setStatusFilter("assigned");
  }

  const classNames: string[] = Array.from(new Set(sessionAssignments.map((a) => a.classes?.name).filter((name): name is string => Boolean(name))));
  const sectionNames: string[] = Array.from(new Set(sessionAssignments.map((a) => a.sections?.name).filter((name): name is string => Boolean(name))));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="border-ink-100/80 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-700 text-lg text-white">+</div>
          <div>
            <h2 className="font-display text-xl text-ink-700">New assignment</h2>
            <p className="mt-1 text-xs leading-5 text-slate/60">Choose the session and an active enrolled staff member.</p>
          </div>
        </div>
        <form onSubmit={handleAssign} className="mt-6 space-y-4 text-sm">
          <div>
            <Label htmlFor="class_id">Class</Label>
          <select
            id="class_id"
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
          </div>
          <div>
            <Label htmlFor="section_id">Section</Label>
          <select
            id="section_id"
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
          </div>
          <div>
            <Label htmlFor="assignment-session">Academic session</Label>
            <select
              id="assignment-session"
              className="w-full rounded-md border border-ink-100 px-3 py-2"
              required
              value={assignmentSessionId}
              onChange={(event) => {
                setAssignmentSessionId(event.target.value);
                setForm((current) => ({ ...current, staff_id: "" }));
              }}
            >
              <option value="">Select session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="staff_id">Class teacher</Label>
          <select
            id="staff_id"
            className="w-full rounded-md border border-ink-100 px-3 py-2"
            required
            value={form.staff_id}
            onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
            disabled={!assignmentSessionId}
          >
            <option value="">{assignmentSessionId ? "Select staff member" : "Select session first"}</option>
            {eligibleStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
            <p className="mt-1.5 text-xs text-slate/50">
              {assignmentSessionId
                ? `${eligibleStaff.length} active staff member${eligibleStaff.length === 1 ? "" : "s"} available`
                : "Staff are filtered by the selected session"}
            </p>
          </div>
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            Assign
          </Button>
        </form>
      </Card>
      <Card className="min-w-0 overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-xl text-ink-700">Current assignments</h2>
            <p className="mt-1 text-xs text-slate/60">One class teacher per section and academic session.</p>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-normal">
            <ClassTeacherExports assignments={filteredAssignments} />
            <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-700">{sessionAssignments.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b border-ink-100 px-5 py-4 sm:px-6">
          {[
            ["Total assignments", totalSections],
            ["Assigned", assignedCount],
            ["Unassigned", unassignedCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-ink-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate/50">{label}</p>
              <p className="mt-1 text-xl font-bold text-ink-700">{value}</p>
            </div>
          ))}
        </div>
        <form
          className="grid gap-2 border-b border-ink-100 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]"
          onSubmit={(event) => event.preventDefault()}
        >
          <input aria-label="Search teacher name" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teacher name..." className="min-h-10 rounded-lg border border-ink-100 bg-white px-3 text-sm outline-none transition placeholder:text-slate/40 focus:border-ink-400 focus:ring-4 focus:ring-ink-50" />
          <select aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="min-h-10 rounded-lg border border-ink-100 bg-white px-3 text-sm text-ink-700 outline-none focus:border-ink-400 focus:ring-4 focus:ring-ink-50">
            <option value="">All classes</option>
            {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select aria-label="Filter by section" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className="min-h-10 rounded-lg border border-ink-100 bg-white px-3 text-sm text-ink-700 outline-none focus:border-ink-400 focus:ring-4 focus:ring-ink-50">
            <option value="">All sections</option>
            {sectionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select aria-label="Filter by assignment status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-10 rounded-lg border border-ink-100 bg-white px-3 text-sm text-ink-700 outline-none focus:border-ink-400 focus:ring-4 focus:ring-ink-50">
            <option value="assigned">Assigned</option>
            <option value="all">All statuses</option>
          </select>
          <Button type="submit" size="sm">Search</Button>
          <Button type="button" size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
        </form>
        <div className="hidden md:block">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                <th className="py-3 pr-4">Teacher</th>
                <th className="py-3 pr-4">Class</th>
                <th className="py-3 pr-4">Section</th>
                <th className="py-3 pr-4">Session</th>
                <th className="py-3 pr-4">Assigned on</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleAssignments.map((a) => (
                <tr key={a.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-4 pr-4 font-medium text-ink-700">{teacherName(a.profiles)}</td>
                  <td className="py-4 pr-4 font-semibold text-ink-700">{a.classes?.name}</td>
                  <td className="py-4 pr-4 text-slate/70">{a.sections?.name}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-700">
                      {a.academic_sessions?.name}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-xs text-slate/60">{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(a)}>View</Button>
                      <Button variant="ghost" size="sm" onClick={() => setRemoveId(a.id)} aria-label={`Remove ${a.classes?.name ?? "class"} assignment`}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate/50">
                    {viewSessionId ? "No assignments for this session." : "No assignments yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 md:hidden">
          {visibleAssignments.map((a) => (
            <article key={a.id} className="group relative overflow-hidden rounded-2xl border border-ink-100 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-violet-100" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                      {teacherName(a.profiles).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-ink-700">{teacherName(a.profiles)}</h3>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Assigned
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-ink-50 px-2 py-1 text-xs font-semibold text-ink-700">
                  {a.classes?.name}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate/55">Section</p>
                  <p className="mt-1 truncate text-xs font-semibold text-ink-700">{a.sections?.name ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate/55">Academic session</p>
                  <p className="mt-1 truncate text-xs font-semibold text-ink-700">{a.academic_sessions?.name ?? "—"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                <p className="text-xs text-slate/60">{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : "Class teacher assigned"}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(a)}>View</Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoveId(a.id)} aria-label={`Remove ${a.classes?.name ?? "class"} assignment`}>
                    <span aria-hidden="true">×</span>
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {filteredAssignments.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-100 py-12 text-center text-sm text-slate/50">
              {viewSessionId ? "No assignments for this session." : "No assignments yet."}
            </div>
          )}
        </div>
        {filteredAssignments.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 text-xs sm:px-6">
            <p className="text-slate/60">
              Showing{" "}
              <span className="font-semibold text-ink-700">
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredAssignments.length)}
              </span>{" "}
              of <span className="font-semibold text-ink-700">{filteredAssignments.length}</span> assignments
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <span className="min-w-16 text-center font-semibold text-ink-700">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-details-title">
          <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate/50">Assignment details</p>
                <h2 id="assignment-details-title" className="mt-1 font-display text-2xl text-ink-700">{teacherName(selectedAssignment.profiles)}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)} aria-label="Close details">×</Button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-ink-50 p-4 text-sm">
              <div><dt className="text-xs text-slate/55">Class</dt><dd className="mt-1 font-semibold text-ink-700">{selectedAssignment.classes?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate/55">Section</dt><dd className="mt-1 font-semibold text-ink-700">{selectedAssignment.sections?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate/55">Academic session</dt><dd className="mt-1 font-semibold text-ink-700">{selectedAssignment.academic_sessions?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate/55">Status</dt><dd className="mt-1 font-semibold text-emerald-700">Assigned</dd></div>
              <div><dt className="text-xs text-slate/55">Assigned on</dt><dd className="mt-1 font-semibold text-ink-700">{selectedAssignment.created_at ? new Date(selectedAssignment.created_at).toLocaleDateString("en-IN") : "—"}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedAssignment(null)}>Close</Button>
              <Button variant="danger" onClick={() => { setSelectedAssignment(null); setRemoveId(selectedAssignment.id); }}>Remove assignment</Button>
            </div>
          </div>
        </div>
      )}
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
