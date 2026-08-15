"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

export async function createExam(sessionId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").insert({ session_id: sessionId, name });
  if (!error) {
    await recordServerAction({
      action: "Create Examination",
      module: "Examination",
      page: "Examinations & Marks",
      resource: "/exams",
      outcome: `Created exam: ${name}`,
    });
  }
  revalidatePath("/exams");
  return { error: error?.message ?? null };
}

export async function setExamPublished(examId: string, isPublished: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").update({ is_published: isPublished }).eq("id", examId);
  if (!error) {
    await recordServerAction({
      action: isPublished ? "Publish Exam Results" : "Unpublish Exam Results",
      module: "Examination",
      page: "Examinations & Marks",
      resource: "/exams",
      outcome: `Exam ${examId} results ${isPublished ? "published" : "hidden"}`,
    });
  }
  revalidatePath("/exams");
  return { error: error?.message ?? null };
}

export async function createSubject(classId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({ class_id: classId, name });
  if (!error) {
    await recordServerAction({
      action: "Create Subject",
      module: "Examination",
      page: "Examinations & Marks",
      resource: "/exams",
      outcome: `Created subject: ${name}`,
    });
  }
  revalidatePath("/exams");
  return { error: error?.message ?? null };
}

export type ExamSubjectLineInput = {
  subject_id: string;
  included: boolean;
  max_marks: string;
  pass_marks: string;
};

export async function saveExamStructure(examId: string, lines: ExamSubjectLineInput[]) {
  const supabase = await createClient();

  for (const line of lines) {
    if (!line.included) {
      const { error } = await supabase
        .from("exam_subjects")
        .delete()
        .eq("exam_id", examId)
        .eq("subject_id", line.subject_id);
      if (error) return { error: error.message };
      continue;
    }

    const maxMarks = Number(line.max_marks);
    const passMarks = Number(line.pass_marks);
    if (!maxMarks || passMarks > maxMarks || passMarks < 0) {
      return { error: `Check the marks entered for this subject — pass marks must be between 0 and max marks` };
    }

    const { error } = await supabase
      .from("exam_subjects")
      .upsert(
        { exam_id: examId, subject_id: line.subject_id, max_marks: maxMarks, pass_marks: passMarks },
        { onConflict: "exam_id,subject_id" }
      );
    if (error) return { error: error.message };
  }

  await recordServerAction({
    action: "Save Exam Subjects",
    module: "Examination",
    page: "Examinations & Marks",
    resource: "/exams",
    outcome: `Saved exam structure for exam ${examId}`,
  });

  revalidatePath("/exams");
  return { error: null };
}

export async function saveMarks(entries: { exam_subject_id: string; student_id: string; marks_obtained: string }[]) {
  const supabase = await createClient();

  const { error } = await supabase.from("marks").upsert(
    entries.map((e) => ({
      exam_subject_id: e.exam_subject_id,
      student_id: e.student_id,
      marks_obtained: Number(e.marks_obtained) || 0,
    })),
    { onConflict: "exam_subject_id,student_id" }
  );

  if (!error) {
    await recordServerAction({
      action: "Save Student Marks",
      module: "Examination",
      page: "Examinations & Marks",
      resource: "/exams/marks",
      outcome: `Saved marks for ${entries.length} student entries`,
    });
  }

  revalidatePath("/exams/marks");
  return { error: error?.message ?? null };
}
