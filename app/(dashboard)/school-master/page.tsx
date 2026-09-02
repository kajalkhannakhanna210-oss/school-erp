import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { Badge, Button, Card } from "@/components/ui";
import { toggleSchool } from "./actions";
import { SchoolTable } from "./school-table";
import { SchoolStatusModal } from "./school-status-modal";
import { StatusHistoryModal, type StatusHistoryItem } from "@/components/status-history-modal";

function SummaryCard({ title, count, subtitle, tone, icon }: { title: string; count: number; subtitle: string; tone: string; icon: React.ReactNode }) {
  const iconTone = title === "Active" ? "bg-emerald-50 text-emerald-600" : title === "Inactive" ? "bg-rose-50 text-rose-500" : title === "Default schools" ? "bg-amber-50 text-amber-500" : "bg-indigo-50 text-ink-700";
  return <div className={`group relative flex min-h-[108px] gap-3 overflow-hidden rounded-2xl border border-ink-100 border-l-4 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:min-h-[124px] sm:p-4 ${tone}`}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>{icon}</div><div className="min-w-0 flex-1 pr-8"><p className="mb-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate/65 sm:text-xs">{title}</p><p className="text-2xl font-black leading-tight text-ink-900 sm:text-3xl">{count}</p><p className="mt-1 truncate text-[10px] text-slate/70 sm:text-xs">{subtitle}</p></div><div className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full ${iconTone}`}>{icon}</div></div>;
}

function SchoolCard({ school, history }: { school: any; history: StatusHistoryItem[] }) {
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 border-l-4 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${school.is_active ? "border-l-emerald-500" : "border-l-rose-400"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-lg text-ink-700">⌂</span>
          <div className="min-w-0">
            <Link href={`/school-master/${school.id}`} className="block truncate text-base font-bold text-ink-700 hover:text-gold-700">{school.name}</Link>
            <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-xs text-slate/60"><span aria-hidden="true">◎</span>{school.code}</p>
          </div>
        </div>
        <div className="shrink-0 text-right"><Badge variant={school.is_active ? "default" : "destructive"}>{school.is_active ? "Active" : "Inactive"}</Badge></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate/50">Type</p><p className="mt-0.5 truncate font-semibold text-ink-700">{school.school_type ?? "—"}</p></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate/50">Board</p><p className="mt-0.5 truncate font-semibold text-ink-700">{school.board ?? "—"}</p></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate/50">Contact</p><p className="mt-0.5 truncate font-semibold text-ink-700">{school.contact_person ?? "—"}</p></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate/50">Location</p><p className="mt-0.5 truncate font-semibold text-ink-700">{school.city ?? "—"}</p></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="min-w-0 flex-1 rounded-lg bg-slate-50/80 px-2.5 py-2"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate/50">Remark</p><div className="min-w-0"><StatusHistoryModal title={school.name} items={history} /></div><p className="mt-1 truncate text-[11px] text-slate/60">{school.short_name ?? `/${school.slug}`}</p></div>
        <div className="flex shrink-0 gap-1.5">
          <Link href={`/school-master/${school.id}`}><Button size="sm" variant="outline" className="min-h-9 w-9 rounded-lg px-0 text-sm" aria-label="View school" title="View school">↗</Button></Link>
          <Link href={`/school-master/${school.id}/edit`}><Button size="sm" variant="outline" className="min-h-9 w-9 rounded-lg px-0 text-sm" aria-label="Edit school" title="Edit school">✎</Button></Link>
          <SchoolStatusModal id={school.id} name={school.name} compact activate={!school.is_active} />
        </div>
      </div>
    </article>
  );
}

export default async function SchoolMasterPage() {
  try { await requirePageAccess("school_master"); } catch { redirect("/dashboard"); }
  const supabase = await createClient();
  const { data: schools } = await supabase.from("schools").select("*").order("name");
  const allSchools = schools ?? [];
  const { data: statusHistory } = await supabase.from("school_status_history").select("id, school_id, status, reason, created_at, created_by").order("created_at", { ascending: false });
  const schoolCreatorIds = [...new Set((statusHistory ?? []).map((item) => item.created_by).filter(Boolean))] as string[];
  const { data: schoolCreators } = schoolCreatorIds.length ? await createAdminClient().from("profiles").select("id, full_name").in("id", schoolCreatorIds) : { data: [] as { id: string; full_name: string | null }[] };
  const schoolCreatorNames = new Map((schoolCreators ?? []).map((profile) => [profile.id, profile.full_name]));
  const historyBySchool = new Map<string, StatusHistoryItem[]>();
  (statusHistory ?? []).forEach((item) => { const schoolHistory = historyBySchool.get(item.school_id) ?? []; schoolHistory.push({ ...item, created_by: item.created_by ? schoolCreatorNames.get(item.created_by) ?? "Unknown user" : "Unknown user" } as StatusHistoryItem); historyBySchool.set(item.school_id, schoolHistory); });
  const activeCount = allSchools.filter((school) => school.is_active).length;
  const inactiveCount = allSchools.length - activeCount;
  const defaultCount = allSchools.filter((school) => school.is_default).length;
  return <div className="-mx-2 -mt-2 min-w-0 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4"><div className="mb-3 flex min-w-0 flex-row items-center justify-between gap-2 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2.5 shadow-sm sm:px-4"><div className="flex min-w-0 items-center gap-2.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg text-ink-700">⌂</div><div className="min-w-0"><h1 className="truncate font-display text-lg font-semibold text-ink-700 sm:text-xl">School Master</h1></div></div><Link href="/school-master/new"><Button className="h-10 shrink-0 whitespace-nowrap"><span className="sm:hidden">+ Add</span><span className="hidden sm:inline">+ Add School</span></Button></Link></div><div className="mb-3 grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4 xl:gap-4"><SummaryCard title="Total schools" count={allSchools.length} subtitle="All school records" tone="border-l-ink-700" icon={<span>⌂</span>} /><SummaryCard title="Active" count={activeCount} subtitle="Currently available" tone="border-l-emerald-500" icon={<span>✓</span>} /><SummaryCard title="Inactive" count={inactiveCount} subtitle="Not currently available" tone="border-l-rose-500" icon={<span>−</span>} /><SummaryCard title="Default schools" count={defaultCount} subtitle="Primary school records" tone="border-l-amber-500" icon={<span>★</span>} /></div><Card className="mt-0 overflow-hidden rounded-2xl border border-ink-100 !p-0 shadow-[0_8px_30px_rgba(30,42,74,0.08)] ring-1 ring-ink-50"><div className="flex items-center justify-between gap-4 border-b-2 border-ink-100 bg-gradient-to-r from-white to-ink-50/40 px-3 py-3 sm:px-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-lg text-white shadow-sm">⌂</div><div className="min-w-0"><h2 className="truncate font-display text-lg font-semibold text-ink-700">Schools</h2><p className="truncate text-xs text-slate/60">Manage schools and their branches.</p></div></div><span className="shrink-0 rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-700">{allSchools.length} shown</span></div><div className="grid gap-3 p-3 sm:gap-4 sm:p-4 md:hidden">{allSchools.map((school) => <SchoolCard key={school.id} school={school} history={historyBySchool.get(school.id) ?? []} />)}{allSchools.length === 0 && <div className="rounded-xl border border-dashed border-ink-100 px-6 py-12 text-center"><p className="font-semibold text-ink-700">No schools found</p><p className="mt-1 text-sm text-slate/60">Add a school to begin managing branches.</p></div>}</div><SchoolTable schools={allSchools} historyBySchool={historyBySchool} /></Card></div>;
}
