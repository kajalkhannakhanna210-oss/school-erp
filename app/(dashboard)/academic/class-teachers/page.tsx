import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { AssignForm } from "./assign-form";

export default async function ClassTeachersPage() {
  try {
    await requirePageAccess("class_teachers");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [
    { data: classes },
    { data: sections },
    { data: sessions },
    { data: staffRows },
    { data: assignments },
  ] = await Promise.all([
    supabase.from("classes").select("*").order("sort_order"),
    supabase.from("sections").select("*").order("name"),
    supabase.from("academic_sessions").select("*").order("start_date", { ascending: false }),
    supabase.from("staff").select("id, profiles(full_name)").eq("is_active", true),
    supabase
      .from("class_teachers")
      .select("*, classes(name), sections(name), academic_sessions(name), profiles(full_name)"),
  ]);

  const staff = (staffRows ?? []).map((s: any) => ({ id: s.id, name: s.profiles?.full_name ?? "" }));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Class Teachers</h1>
      <p className="mt-1 text-sm text-slate/60">
        Assign one staff member per class, section, and session.
      </p>
      <AssignForm
        classes={classes ?? []}
        sections={sections ?? []}
        sessions={sessions ?? []}
        staff={staff}
        assignments={assignments ?? []}
      />
    </div>
  );
}
