import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { MarksGrid } from "./marks-grid";
import { MarksPicker } from "./marks-picker";

export default async function MarksEntryPage({
  searchParams,
}: {
  searchParams: { exam?: string; class?: string; section?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role === "student") redirect("/exams");
  const isAdmin = profile?.role === "super_admin";

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name")
    .order("created_at", { ascending: false });

  let picker: ReactNode;
  if (isAdmin) {
    const [{ data: classes }, { data: sections }] = await Promise.all([
      supabase.from("classes").select("id, name").order("sort_order"),
      supabase.from("sections").select("id, name, class_id").order("name"),
    ]);
    picker = (
      <MarksPicker mode="full" exams={exams ?? []} classes={classes ?? []} sections={sections ?? []} />
    );
  } else {
    const { data: assigned } = await supabase
      .from("class_teachers")
      .select("class_id, section_id, classes(name), sections(name)")
      .eq("staff_id", user!.id);
    const pairs = (assigned ?? []).map((a: any) => ({
      class_id: a.class_id,
      section_id: a.section_id,
      label: `${a.classes?.name} - ${a.sections?.name}`,
    }));
    picker = <MarksPicker mode="assigned" exams={exams ?? []} pairs={pairs} />;
  }

  const { exam: examId, class: classId, section: sectionId } = searchParams;

  let grid: ReactNode = null;
  if (examId && classId && sectionId) {
    const [{ data: exam }, { data: students }, { data: examSubjects }] = await Promise.all([
      supabase.from("exams").select("id, name, is_published").eq("id", examId).single(),
      supabase
        .from("students")
        .select("id, admission_number, profiles(full_name)")
        .eq("class_id", classId)
        .eq("section_id", sectionId)
        .eq("is_active", true)
        .order("admission_number"),
      supabase
        .from("exam_subjects")
        .select("id, max_marks, subjects!inner(name, class_id)")
        .eq("exam_id", examId)
        .eq("subjects.class_id", classId),
    ]);

    const columns = (examSubjects ?? []).map((es: any) => ({
      id: es.id,
      subject_name: es.subjects?.name ?? "",
      max_marks: es.max_marks,
    }));

    const studentRows = (students ?? []).map((s: any) => ({
      id: s.id,
      admission_number: s.admission_number,
      full_name: s.profiles?.full_name ?? "",
    }));

    let existingMarks: Record<string, Record<string, number>> = {};
    if (columns.length > 0 && studentRows.length > 0) {
      const { data: marks } = await supabase
        .from("marks")
        .select("exam_subject_id, student_id, marks_obtained")
        .in(
          "exam_subject_id",
          columns.map((c) => c.id)
        );
      existingMarks = {};
      for (const m of marks ?? []) {
        if (!existingMarks[m.student_id]) existingMarks[m.student_id] = {};
        existingMarks[m.student_id][m.exam_subject_id] = m.marks_obtained;
      }
    }

    const readOnly = !isAdmin && !!exam?.is_published;

    grid = (
      <div className="mt-6">
        <MarksGrid
          students={studentRows}
          columns={columns}
          existingMarks={existingMarks}
          readOnly={readOnly}
          label={exam?.name ?? ""}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Enter Marks</h1>
      <p className="mt-1 text-sm text-slate/60">Pick an exam, class, and section.</p>
      <div className="mt-6">{picker}</div>
      {grid}
    </div>
  );
}
