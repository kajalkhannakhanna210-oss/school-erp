"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { createClient } from "@/lib/supabase/client";
import { createExam, createSubject, saveExamStructure, setExamPublished, type ExamSubjectLineInput } from "./actions";

type Option = { id: string; name: string };
type Exam = { id: string; name: string; is_published: boolean; academic_sessions: { name: string } | null };
type Subject = { id: string; name: string; class_id: string };

export function ExamsTabs({
  exams,
  classes,
  sessions,
  subjects,
}: {
  exams: Exam[];
  classes: Option[];
  sessions: Option[];
  subjects: Subject[];
}) {
  const [tab, setTab] = useState<"exams" | "subjects" | "structure">("exams");

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between border-b border-ink-100">
        <div className="flex gap-2">
          {(
            [
              ["exams", "Exams"],
              ["subjects", "Subjects"],
              ["structure", "Structure"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === key ? "border-b-2 border-gold text-ink-700" : "text-slate/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href="/exams/marks" className="pb-2">
          <Button variant="ghost">Enter Marks</Button>
        </Link>
      </div>
      <div className="mt-6">
        {tab === "exams" && <ExamsTab exams={exams} sessions={sessions} />}
        {tab === "subjects" && <SubjectsTab classes={classes} subjects={subjects} />}
        {tab === "structure" && <StructureTab exams={exams} classes={classes} subjects={subjects} />}
      </div>
    </div>
  );
}

function ExamsTab({ exams, sessions }: { exams: Exam[]; sessions: Option[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [toggleTarget, setToggleTarget] = useState<Exam | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createExam(sessionId, name);
      if (error) {
        push(error, "error");
        return;
      }
      push("Exam created");
      setName("");
    });
  }

  function handleToggle() {
    if (!toggleTarget) return;
    const next = !toggleTarget.is_published;
    startTransition(async () => {
      const { error } = await setExamPublished(toggleTarget.id, next);
      setToggleTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push(next ? "Results published" : "Results unpublished");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New exam</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="exam-name">Name</Label>
            <Input
              id="exam-name"
              required
              placeholder="Mid-Term 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="exam-session">Session</Label>
            <select
              id="exam-session"
              required
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add exam
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Name</th>
              <th className="pb-2">Session</th>
              <th className="pb-2">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3">{e.name}</td>
                <td className="py-3 text-slate/70">{e.academic_sessions?.name}</td>
                <td className="py-3">
                  <Badge>{e.is_published ? "Published" : "Draft"}</Badge>
                </td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setToggleTarget(e)}>
                    {e.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate/50">
                  No exams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_published ? "Unpublish results?" : "Publish results?"}
        description={
          toggleTarget?.is_published
            ? "Students immediately lose access to these results, and class teachers can resume editing marks."
            : "Students can immediately see their results for this exam. Marks entry locks for class teachers until unpublished again."
        }
        confirmLabel={toggleTarget?.is_published ? "Unpublish" : "Publish"}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}

function SubjectsTab({ classes, subjects }: { classes: Option[]; subjects: Subject[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");

  const filtered = subjects.filter((s) => s.class_id === classId);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!classId) return;
    startTransition(async () => {
      const { error } = await createSubject(classId, name);
      if (error) {
        push(error, "error");
        return;
      }
      push("Subject added");
      setName("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New subject</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="subj-class">Class</Label>
            <select
              id="subj-class"
              required
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
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
            <Label htmlFor="subj-name">Subject name</Label>
            <Input
              id="subj-name"
              required
              placeholder="Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending || !classId} className="w-full">
            Add subject
          </Button>
        </form>
      </Card>
      <Card>
        {!classId ? (
          <p className="text-sm text-slate/50">Pick a class to see its subjects.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {filtered.map((s) => (
              <li key={s.id} className="border-b border-ink-100 py-2 last:border-0">
                {s.name}
              </li>
            ))}
            {filtered.length === 0 && <li className="text-slate/50">No subjects for this class yet.</li>}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StructureTab({ exams, classes, subjects }: { exams: Exam[]; classes: Option[]; subjects: Subject[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [lines, setLines] = useState<ExamSubjectLineInput[] | null>(null);
  const [loading, setLoading] = useState(false);

  const classSubjects = subjects.filter((s) => s.class_id === classId);

  async function loadStructure() {
    if (!examId || !classId) return;
    setLoading(true);
    const supabase = createClient();
    const subjectIds = classSubjects.map((s) => s.id);
    const { data: existing } = await supabase
      .from("exam_subjects")
      .select("*")
      .eq("exam_id", examId)
      .in("subject_id", subjectIds.length > 0 ? subjectIds : [""]);

    const byId = Object.fromEntries((existing ?? []).map((e: any) => [e.subject_id, e]));
    setLines(
      classSubjects.map((s) => {
        const ex = byId[s.id];
        return {
          subject_id: s.id,
          included: !!ex,
          max_marks: ex ? String(ex.max_marks) : "100",
          pass_marks: ex ? String(ex.pass_marks) : "33",
        };
      })
    );
    setLoading(false);
  }

  function updateLine(subjectId: string, patch: Partial<ExamSubjectLineInput>) {
    setLines((prev) => prev?.map((l) => (l.subject_id === subjectId ? { ...l, ...patch } : l)) ?? null);
  }

  function handleSave() {
    if (!lines) return;
    startTransition(async () => {
      const { error } = await saveExamStructure(examId, lines);
      if (error) {
        push(error, "error");
        return;
      }
      push("Exam structure saved");
    });
  }

  return (
    <div>
      <p className="text-sm text-slate/60">Which subjects this exam covers for a class, and their max/pass marks.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={examId}
          onChange={(e) => {
            setExamId(e.target.value);
            setLines(null);
          }}
        >
          <option value="">Select exam</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setLines(null);
          }}
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={loadStructure} disabled={!examId || !classId || loading}>
          {loading ? "Loading…" : "Load structure"}
        </Button>
      </div>

      {lines && (
        <Card className="mt-6">
          {classSubjects.length === 0 ? (
            <p className="text-sm text-slate/50">This class has no subjects yet — add some in the Subjects tab.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                    <th className="py-2">Include</th>
                    <th className="py-2">Subject</th>
                    <th className="py-2">Max Marks</th>
                    <th className="py-2">Pass Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const subject = classSubjects.find((s) => s.id === line.subject_id)!;
                    return (
                      <tr key={line.subject_id} className="border-b border-ink-100 last:border-0">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={line.included}
                            onChange={(e) => updateLine(line.subject_id, { included: e.target.checked })}
                          />
                        </td>
                        <td className="py-2">{subject.name}</td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={!line.included}
                            value={line.max_marks}
                            onChange={(e) => updateLine(line.subject_id, { max_marks: e.target.value })}
                            className="mt-0 w-24"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="0"
                            disabled={!line.included}
                            value={line.pass_marks}
                            onChange={(e) => updateLine(line.subject_id, { pass_marks: e.target.value })}
                            className="mt-0 w-24"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Button onClick={handleSave} disabled={pending} className="mt-4">
                {pending ? "Saving…" : "Save structure"}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
