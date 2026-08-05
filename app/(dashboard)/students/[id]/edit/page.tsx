import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "../../student-form";

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const [{ data: student }, { data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("students").select("*, profiles(full_name)").eq("id", params.id).single(),
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  if (!student) notFound();
  const s = student as any;
  let existingPhotoUrl: string | null = null;
  if (s.photo_path) {
    const { data: signed } = await supabase.storage.from("student-photos").createSignedUrl(s.photo_path, 60 * 10);
    existingPhotoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink-700">Edit Student</h1>
        <Link href="/students" className="inline-flex min-h-10 items-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink-700 shadow-sm">← Back to student list</Link>
      </div>
      <div className="mt-6">
        <StudentForm
          mode="edit"
          studentId={s.id}
          initial={{
            full_name: s.profiles?.full_name ?? "",
            roll_number: s.roll_number ?? "",
            father_name: s.father_name ?? "",
            mother_name: s.mother_name ?? "",
            gender: s.gender ?? "",
            date_of_birth: s.date_of_birth ?? "",
            blood_group: s.blood_group ?? "",
            address: s.address ?? "",
            mobile_number: s.mobile_number ?? "",
            class_id: s.class_id ?? "",
            section_id: s.section_id ?? "",
            session_id: s.session_id ?? "",
            admission_date: s.admission_date ?? "",
          }}
          existingPhotoUrl={existingPhotoUrl}
          classes={classes ?? []}
          sections={sections ?? []}
          sessions={sessions ?? []}
        />
      </div>
    </div>
  );
}
