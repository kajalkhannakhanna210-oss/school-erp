import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExamsTabs } from "./exams-tabs";

export default async function ExamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role === "student") {
    return <StudentResultsView studentId={user!.id} />;
  }

  if (profile?.role === "staff") {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink-700">Exams</h1>
        <p className="mt-1 text-sm text-slate/60">
          Exam setup is admin-managed. You can enter marks for your assigned classes once an exam is unpublished.
        </p>
        <Link href="/exams/marks" className="mt-6 inline-block">
          <Button>Enter Marks</Button>
        </Link>
      </div>
    );
  }

  const [{ data: exams }, { data: classes }, { data: sessions }, { data: subjects }] = await Promise.all([
    supabase.from("exams").select("*, academic_sessions(name)").order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
    supabase.from("subjects").select("id, name, class_id").order("name"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Exams &amp; Results</h1>
      <p className="mt-1 text-sm text-slate/60">Exams, subjects per class, and marks structure.</p>
      <ExamsTabs exams={exams ?? []} classes={classes ?? []} sessions={sessions ?? []} subjects={subjects ?? []} />
    </div>
  );
}

async function StudentResultsView({ studentId }: { studentId: string }) {
  const supabase = await createClient();

  // RLS on the underlying `marks` table already means an unpublished exam
  // simply won't appear here — no extra filtering needed.
  const { data: results } = await supabase
    .from("exam_results")
    .select("*")
    .eq("student_id", studentId)
    .order("exam_name");

  const { data: allMarks } = await supabase
    .from("marks")
    .select("exam_subject_id, marks_obtained, exam_subjects(exam_id, max_marks, pass_marks, subjects(name))")
    .eq("student_id", studentId);

  const marksByExam = new Map<string, any[]>();
  for (const m of (allMarks ?? []) as any[]) {
    const examId = m.exam_subjects?.exam_id;
    if (!examId) continue;
    if (!marksByExam.has(examId)) marksByExam.set(examId, []);
    marksByExam.get(examId)!.push(m);
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">My Results</h1>
      <p className="mt-1 text-sm text-slate/60">Published exam results only.</p>

      <div className="mt-6 space-y-6">
        {(results ?? []).map((r: any) => (
          <Card key={r.exam_id}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-ink-700">{r.exam_name}</h2>
              <Badge>Grade {r.grade}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate/60">
              {r.total_obtained} / {r.total_max} · {r.percentage}%
              {r.passed_all_subjects === false && (
                <span className="ml-2 text-danger">Did not clear all subjects</span>
              )}
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                  <th className="py-2">Subject</th>
                  <th className="py-2">Marks</th>
                  <th className="py-2">Max</th>
                  <th className="py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {(marksByExam.get(r.exam_id) ?? []).map((m: any) => (
                  <tr key={m.exam_subject_id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2">{m.exam_subjects?.subjects?.name}</td>
                    <td className="py-2 font-mono">{m.marks_obtained}</td>
                    <td className="py-2 font-mono">{m.exam_subjects?.max_marks}</td>
                    <td className="py-2">
                      {m.marks_obtained >= m.exam_subjects?.pass_marks ? (
                        <span className="text-success">Pass</span>
                      ) : (
                        <span className="text-danger">Fail</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
        {(results ?? []).length === 0 && <p className="text-sm text-slate/50">No published results yet.</p>}
      </div>
    </div>
  );
}
