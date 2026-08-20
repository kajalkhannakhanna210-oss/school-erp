import { createClient } from "@/lib/supabase/server";

export async function getStudentStats(supabaseClient: Awaited<ReturnType<typeof createClient>> | null, sessionId?: string) {
  const supabase = supabaseClient ?? await createClient();

  // helper: when enrollment IDs exist, restrict queries to those ids
  let enrollmentStudentIds: string[] | null = null;
  if (sessionId) {
    const { data: enrollments } = await supabase.from("student_enrollments").select("student_id").eq("session_id", sessionId);
    enrollmentStudentIds = (enrollments ?? []).map((r: any) => r.student_id);
  }

  function applyEnrollment(query: any) {
    if (!enrollmentStudentIds) return query;
    if (enrollmentStudentIds.length === 0) return query.eq("id", "00000000-0000-0000-0000-000000000000");
    return query.in("id", enrollmentStudentIds);
  }

  // Counts — use ALL students (active + archived) for total and admission assignment counts so cards sum correctly
  const totalQ = applyEnrollment(supabase.from("students").select("id", { count: "exact", head: true }));
  const assignedQ = applyEnrollment(supabase.from("students").select("id", { count: "exact", head: true }).not("admission_number", "is", null).neq("admission_number", ""));
  const unassignedQ = applyEnrollment(supabase.from("students").select("id", { count: "exact", head: true }).or("admission_number.is.null,admission_number.eq."));
  const archivedQ = applyEnrollment(supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", false));

  // Students who left (leaving requests with final status)
  const leftQ = sessionId
    ? supabase.from("student_leaving_requests").select("student_id", { count: "exact", head: true }).eq("status", "student_left").eq("session_id", sessionId)
    : supabase.from("student_leaving_requests").select("student_id", { count: "exact", head: true }).eq("status", "student_left");

  const [{ count: totalStudents }, { count: assignedCount }, { count: unassignedCount }, { count: archivedCount }, { count: studentsLeft }] = await Promise.all([
    totalQ,
    assignedQ,
    unassignedQ,
    archivedQ,
    leftQ,
  ]);

  // Old students: students enrolled in selected session who also have enrollments in earlier sessions
  let oldStudents = 0;
  if (sessionId) {
    const { data: selected } = await supabase.from("academic_sessions").select("start_date").eq("id", sessionId).maybeSingle();
    if (selected?.start_date) {
      const { data: earlier } = await supabase.from("academic_sessions").select("id").lt("start_date", selected.start_date);
      const earlierIds = (earlier ?? []).map((r: any) => r.id);
      if (earlierIds.length && enrollmentStudentIds && enrollmentStudentIds.length) {
        // find which of the students in this session also appear in earlier sessions
        const { data: rows, count } = await supabase.from("student_enrollments").select("student_id", { count: "exact", head: true }).in("session_id", earlierIds).in("student_id", enrollmentStudentIds);
        oldStudents = count ?? 0;
      } else {
        oldStudents = 0;
      }
    }
  } else {
    // For all-sessions view, define old students as students with >1 enrollment
    const { data: enrollments } = await supabase.from("student_enrollments").select("student_id");
    const counter = new Map<string, number>();
    for (const e of (enrollments ?? [])) counter.set(e.student_id, (counter.get(e.student_id) ?? 0) + 1);
    oldStudents = Array.from(counter.values()).filter((c) => c > 1).length;
  }

  return {
    totalStudents: Number(totalStudents ?? 0),
    newStudents: Number(unassignedCount ?? 0),
    studentsWithAdmissionNumber: Number(assignedCount ?? 0),
    oldStudents: Number(oldStudents ?? 0),
    archivedStudents: Number(archivedCount ?? 0),
    studentsLeft: Number(studentsLeft ?? 0),
  };
}
