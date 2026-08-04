import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const [{ data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  return (
    <div>
      <div className="flex justify-end"><Link href="/students" className="inline-flex min-h-10 items-center rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gold-600">← Back to students</Link></div>
      <h1 className="font-display text-2xl text-ink-700">Add Student</h1>
      <p className="mt-1 text-sm text-slate/60">
        Creates the student&apos;s login directly without sending an email invitation.
      </p>
      <div className="mt-6">
        <StudentForm
          mode="create"
          classes={classes ?? []}
          sections={sections ?? []}
          sessions={sessions ?? []}
        />
      </div>
    </div>
  );
}
