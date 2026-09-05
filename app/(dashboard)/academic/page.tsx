import { createClient } from "@/lib/supabase/server";
import { AcademicTabs } from "./academic-tabs";
import { getMasterDataContext } from "@/lib/security/master-data-context";

export default async function AcademicPage() {
  const supabase = await createClient();
  const context = await getMasterDataContext();
  const [{ data: sessions }, { data: classes }, { data: sections }, { data: wings }] = await Promise.all([
    context.schoolId ? supabase.from("academic_sessions").select("*").eq("school_id", context.schoolId).order("start_date", { ascending: false }) : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("classes").select("*").eq("school_id", context.schoolId).order("sort_order") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("sections").select("*, classes!inner(name, school_id, organization_id)").eq("classes.school_id", context.schoolId).eq("classes.organization_id", context.organizationId).order("name") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("school_wings").select("id, wing_name, wing_code, is_active").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("display_order") : Promise.resolve({ data: [] }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Academic Structure</h1>
      <p className="mt-1 text-sm text-slate/60">
        Sessions, classes, and sections used across every other module.
      </p>
      <AcademicTabs sessions={sessions ?? []} classes={classes ?? []} sections={sections ?? []} wings={wings ?? []} schools={context.schools} organizationId={context.organizationId} schoolId={context.schoolId} loginScope={context.loginScope} />
    </div>
  );
}
