import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "../../student-form";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { SchoolContextSelector } from "../../../academic/school-context-selector";

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const context = await getMasterDataContext();

  const [{ data: student }, { data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase
      .from("students")
      .select("*, profiles!students_id_fkey(full_name)")
      .eq("id", params.id)
      .maybeSingle(),
    context.schoolId ? supabase.from("classes").select("id, name, wing_id, school_wings(wing_name)").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("sort_order") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("sections").select("id, name, class_id").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("name") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("academic_sessions").select("id, name").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("start_date", { ascending: false }) : Promise.resolve({ data: [] }),
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
      <SchoolContextSelector schools={context.schools} organizationId={context.organizationId} schoolId={context.schoolId} loginScope={context.loginScope} />
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
            admission_number: s.admission_number ?? "",
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
          classes={(classes ?? []).map((item: any) => ({ id: item.id, name: item.name, wing_name: Array.isArray(item.school_wings) ? item.school_wings[0]?.wing_name ?? null : item.school_wings?.wing_name ?? null }))}
          sections={sections ?? []}
          sessions={sessions ?? []}
        />
      </div>
    </div>
  );
}
