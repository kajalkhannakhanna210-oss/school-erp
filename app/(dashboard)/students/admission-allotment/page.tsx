import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdmissionAllotmentForm } from "./form";

export default async function AdmissionAllotmentPage({ searchParams }: { searchParams: { session?: string } }) {
  const supabase = await createClient();
  let enrollmentIds: string[] | null = null;
  if (searchParams.session) {
    const { data: enrollments } = await supabase.from("student_enrollments").select("student_id").eq("session_id", searchParams.session);
    enrollmentIds = (enrollments ?? []).map((row) => row.student_id);
  }
  const [{ data: students }, { data: sections }, { data: assignedStudents }] = await Promise.all([
    (() => { let query = supabase.from("students").select("id, admission_number, mobile_number, photo_path, class_id, section_id, profiles(full_name), classes(id, name), sections(name)").is("admission_number", null); if (searchParams.session) query = enrollmentIds?.length ? query.in("id", enrollmentIds) : query.eq("id", "00000000-0000-0000-0000-000000000000"); return query.order("admission_number"); })(),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("students").select("admission_number").not("admission_number", "is", null),
  ]);
  const year = new Date().getFullYear();
  const prefix = `ADM${year}`;
  const highestAssignedNumber = (assignedStudents ?? []).reduce((highest, student) => {
    const match = typeof student.admission_number === "string" ? student.admission_number.match(new RegExp(`^${prefix}(\\d+)$`, "i")) : null;
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const rows = await Promise.all((students ?? []).map(async (s: any) => {
    let photo_url = null;
    if (s.photo_path) { const { data: signed } = await supabase.storage.from("student-photos").createSignedUrl(s.photo_path, 60 * 10); photo_url = signed?.signedUrl ?? null; }
    return { id: s.id, admission_number: s.admission_number, mobile_number: s.mobile_number, photo_url, section_id: s.section_id, profiles: Array.isArray(s.profiles) ? s.profiles[0] ?? null : s.profiles, classes: Array.isArray(s.classes) ? s.classes[0] ?? null : s.classes, sections: Array.isArray(s.sections) ? s.sections[0] ?? null : s.sections };
  }));
  return <div className="w-full"><div className="flex flex-col gap-3 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Admissions</p><h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700">Admission allotment</h1><p className="text-xs text-slate/60">Students without an admission number</p></div><div className="flex flex-wrap items-center gap-2 sm:gap-3"><div aria-label={`${rows.length} students without admission number`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gold-200 bg-gold-50 px-3 py-1.5"><span className="font-display text-xl font-bold leading-none text-gold-700">{rows.length}</span><span className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Pending</span></div><Link href="/students" className="inline-flex min-h-9 items-center rounded-lg bg-ink-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">← Back to students</Link></div></div><div className="mt-3"><AdmissionAllotmentForm students={rows} sections={sections ?? []} nextAdmissionNumber={highestAssignedNumber + 1} /></div></div>;
}
