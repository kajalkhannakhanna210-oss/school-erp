import { notFound } from "next/navigation";
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

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Edit Student</h1>
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
          classes={classes ?? []}
          sections={sections ?? []}
          sessions={sessions ?? []}
        />
      </div>
    </div>
  );
}
