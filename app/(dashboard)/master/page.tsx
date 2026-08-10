import { redirect } from "next/navigation";
import { AcademicTabs } from "../academic/academic-tabs";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";

export default async function MasterDataPage() {
  try {
    await requirePageAccess("master");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: sessions }, { data: classes }, { data: sections }, { data: departments }, { data: designations }] = await Promise.all([
    supabase.from("academic_sessions").select("*").order("start_date", { ascending: false }),
    supabase.from("classes").select("*").order("sort_order"),
    supabase.from("sections").select("*, classes(name)").order("name"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("designations").select("*").order("name"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Master Data</h1>
      <p className="mt-1 text-sm text-slate/60">
        Create and manage academic sessions, classes, and sections for the school.
      </p>
      <AcademicTabs sessions={sessions ?? []} classes={classes ?? []} sections={sections ?? []} departments={departments ?? []} designations={designations ?? []} />
    </div>
  );
}
