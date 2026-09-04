import { redirect } from "next/navigation";
import { AcademicTabs } from "../academic/academic-tabs";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { SchoolContextSelector } from "../academic/school-context-selector";

function MasterSummary({ title, count, subtitle, tone, icon }: { title: string; count: number; subtitle: string; tone: string; icon: string }) {
  return <div className={`relative flex min-h-[108px] gap-3 overflow-hidden rounded-2xl border border-ink-100 border-l-4 bg-white p-3.5 shadow-sm sm:min-h-[120px] sm:p-4 ${tone}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-lg text-ink-700">{icon}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate/65 sm:text-xs">{title}</p><p className="mt-1 text-2xl font-black leading-tight text-ink-900 sm:text-3xl">{count}</p><p className="mt-1 text-[10px] text-slate/70 sm:text-xs">{subtitle}</p></div></div>;
}

export default async function MasterDataPage() {
  try {
    await requirePageAccess("master");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const context = await getMasterDataContext();

  const [{ data: sessions }, { data: classes }, { data: sections }, { data: departments }, { data: designations }, { data: wings }] = await Promise.all([
    context.schoolId ? supabase.from("academic_sessions").select("*").eq("school_id", context.schoolId).order("start_date", { ascending: false }) : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("classes").select("*").eq("school_id", context.schoolId).order("sort_order") : Promise.resolve({ data: [] }),
    context.schoolId ? supabase.from("sections").select("*, classes(name)").eq("school_id", context.schoolId).order("name") : Promise.resolve({ data: [] }),
    supabase.from("departments").select("*").order("name"),
    supabase.from("designations").select("*").order("name"),
    context.schoolId ? supabase.from("school_wings").select("id, wing_name, wing_code, is_active").eq("organization_id", context.organizationId).eq("school_id", context.schoolId).order("display_order") : Promise.resolve({ data: [] }),
  ]);
  const sessionCount = sessions?.length ?? 0;
  const classCount = classes?.length ?? 0;
  const sectionCount = sections?.length ?? 0;
  const currentSessionCount = sessions?.filter((session) => session.is_current).length ?? 0;

  return (
    <div className="-mx-2 -mt-2 min-w-0 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4">
      <div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-3 shadow-sm sm:px-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg text-ink-700">⌂</div><div className="min-w-0"><h1 className="truncate font-display text-lg font-semibold text-ink-700 sm:text-xl">Master Data</h1><p className="mt-0.5 truncate text-xs text-slate/60 sm:text-sm">Manage academic structure for the selected school.</p></div></div>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-4"><MasterSummary title="Academic sessions" count={sessionCount} subtitle="Configured sessions" tone="border-l-ink-700" icon="◷" /><MasterSummary title="Classes" count={classCount} subtitle="School classes" tone="border-l-emerald-500" icon="▦" /><MasterSummary title="Sections" count={sectionCount} subtitle="Class sections" tone="border-l-amber-500" icon="≡" /><MasterSummary title="Current session" count={currentSessionCount} subtitle="Active academic year" tone="border-l-rose-500" icon="✓" /></div>
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white p-3 shadow-[0_8px_30px_rgba(30,42,74,0.08)] ring-1 ring-ink-50 sm:p-4"><div className="mb-1 flex flex-col gap-3 border-b-2 border-ink-100 pb-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-lg text-white">⌂</div><div><h2 className="font-display text-lg font-semibold text-ink-700">Academic master records</h2><p className="text-xs text-slate/60">Sessions, classes, sections, departments, and designations.</p></div></div><SchoolContextSelector schools={context.schools} organizationId={context.organizationId} schoolId={context.schoolId} loginScope={context.loginScope} compact /></div><AcademicTabs sessions={sessions ?? []} classes={classes ?? []} sections={sections ?? []} wings={wings ?? []} departments={departments ?? []} designations={designations ?? []} schools={context.schools} organizationId={context.organizationId} schoolId={context.schoolId} loginScope={context.loginScope} showSchoolSelector={false} /></div>
    </div>
  );
}
