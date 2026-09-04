import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import Link from "next/link";
import { StudentForm } from "../student-form";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { SchoolContextSelector } from "../../academic/school-context-selector";

export default async function NewStudentPage() {
  await requirePageAccess("students");
  const supabase = await createClient();
  const context = await getMasterDataContext();
  const [{ data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    context.schoolId ? supabase.from("classes").select("id, name, wing_id, school_wings(wing_name)").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("sort_order") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("sections").select("id, name, class_id").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("name") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("academic_sessions").select("id, name").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("start_date", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  return (
    <div>
      <SchoolContextSelector schools={context.schools} organizationId={context.organizationId} schoolId={context.schoolId} loginScope={context.loginScope} />
      <div className="flex justify-end"><Link href="/students" className="inline-flex min-h-10 items-center rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gold-600">← Back to students</Link></div>
      <h1 className="font-display text-2xl text-ink-700">Add Student</h1>
      <p className="mt-1 text-sm text-slate/60">
        Creates the student&apos;s login directly without sending an email invitation.
      </p>
      <div className="mt-6">
        <StudentForm
          mode="create"
          classes={(classes ?? []).map((item: any) => ({ id: item.id, name: item.name, wing_name: Array.isArray(item.school_wings) ? item.school_wings[0]?.wing_name ?? null : item.school_wings?.wing_name ?? null }))}
          sections={sections ?? []}
          sessions={sessions ?? []}
        />
      </div>
    </div>
  );
}
