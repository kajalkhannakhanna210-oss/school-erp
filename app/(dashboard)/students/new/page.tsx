import { createClient } from "@/lib/supabase/server";
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
      <h1 className="font-display text-2xl text-ink-700">Add Student</h1>
      <p className="mt-1 text-sm text-slate/60">
        Creates the student&apos;s login and sends them an email to set their password.
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
