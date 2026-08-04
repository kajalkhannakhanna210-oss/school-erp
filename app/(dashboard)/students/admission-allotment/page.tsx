import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdmissionAllotmentForm } from "./form";
export default async function AdmissionAllotmentPage() {
  const supabase = await createClient();
  const [{ data: students }, { data: sections }] = await Promise.all([supabase.from("students").select("id, admission_number, mobile_number, class_id, section_id, profiles(full_name), classes(id, name), sections(name)").order("admission_number"), supabase.from("sections").select("id, name, class_id").order("name")]);
  const rows = (students ?? []).map((s: any) => ({ id: s.id, admission_number: s.admission_number, mobile_number: s.mobile_number, section_id: s.section_id, profiles: Array.isArray(s.profiles) ? s.profiles[0] ?? null : s.profiles, classes: Array.isArray(s.classes) ? s.classes[0] ?? null : s.classes, sections: Array.isArray(s.sections) ? s.sections[0] ?? null : s.sections }));
  return <div className="w-full"><div className="flex flex-col gap-3 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Admissions</p><h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700">Admission allotment</h1><p className="text-xs text-slate/60">Assign admission numbers and sections to student records.</p></div><Link href="/students" className="inline-flex min-h-9 items-center rounded-lg bg-ink-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gold-600">← Back to students</Link></div><div className="mt-3"><AdmissionAllotmentForm students={rows} sections={sections ?? []} /></div></div>;
}
