import { createClient } from "@/lib/supabase/server";
import { AcademicTabs } from "./academic-tabs";

export default async function AcademicPage() {
  const supabase = await createClient();
  const [{ data: sessions }, { data: classes }, { data: sections }] = await Promise.all([
    supabase.from("academic_sessions").select("*").order("start_date", { ascending: false }),
    supabase.from("classes").select("*").order("sort_order"),
    supabase.from("sections").select("*, classes(name)").order("name"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Academic Structure</h1>
      <p className="mt-1 text-sm text-slate/60">
        Sessions, classes, and sections used across every other module.
      </p>
      <AcademicTabs sessions={sessions ?? []} classes={classes ?? []} sections={sections ?? []} />
    </div>
  );
}
