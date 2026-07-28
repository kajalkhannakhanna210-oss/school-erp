import { createClient } from "@/lib/supabase/server";
import { PromoteForm } from "./promote-form";

export default async function PromotePage() {
  const supabase = await createClient();
  const [{ data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Promote Students</h1>
      <p className="mt-1 text-sm text-slate/60">
        Moves every active student in a class + section to a new class, section, and session in one step.
      </p>
      <div className="mt-6">
        <PromoteForm classes={classes ?? []} sections={sections ?? []} sessions={sessions ?? []} />
      </div>
    </div>
  );
}
