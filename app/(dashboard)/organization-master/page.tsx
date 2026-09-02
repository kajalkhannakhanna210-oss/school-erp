import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { Badge, Button, Card, Input } from "@/components/ui";
import { toggleOrganization } from "./actions";
import { OrganizationCreateModal } from "./organization-create-modal";
import { OrganizationFilterProcessing, OrganizationFilters } from "./organization-filters";
import { OrganizationStatusModal } from "./organization-status-modal";
import { OrganizationBranchesModal } from "./organization-branches-modal";
import { StatusHistoryModal, type StatusHistoryItem } from "@/components/status-history-modal";

type SearchParams = { q?: string; status?: string };

function formatCreatedAt(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}

function SummaryCard({ title, count, subtitle, tone, icon }: { title: string; count: number; subtitle: string; tone: string; icon: React.ReactNode }) {
  const iconTone = title === "Active" ? "bg-emerald-50 text-emerald-600" : title === "Inactive" ? "bg-rose-50 text-rose-500" : title === "School branches" ? "bg-amber-50 text-amber-500" : "bg-indigo-50 text-ink-700";
  return (
    <div className={`group relative flex min-h-[108px] gap-3 overflow-hidden rounded-2xl border border-ink-100 border-l-4 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md sm:min-h-[124px] sm:p-4 ${tone}`}>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>{icon}</div>
      <div className="min-w-0 flex-1 pr-8"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate/65 sm:text-xs">{title}</p><p className="text-2xl font-black leading-tight text-ink-900 sm:text-3xl">{count}</p><p className="mt-1 text-[10px] leading-tight text-slate/70 sm:text-xs">{subtitle}</p></div>
      <div className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full ${iconTone} transition-transform group-hover:scale-105`}>{icon}</div>
    </div>
  );
}

function OrganizationCard({ organization, schools, history }: { organization: { id: string; code: string; name: string; is_active: boolean; inactive_reason?: string | null; created_at: string }; schools: { id: string; code: string; name: string; slug?: string | null; is_active: boolean }[]; history: StatusHistoryItem[] }) {
  return (
    <article className={`group relative overflow-hidden rounded-xl border border-slate-200/90 border-l-4 bg-white p-2.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:p-3.5 ${organization.is_active ? "border-l-emerald-500" : "border-l-rose-400"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-700 text-white shadow-sm"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20h16M6 20V8l6-4 6 4v12M9 20v-5h6v5M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <div className="min-w-0">
            <Link href={`/organization-master/${organization.id}`} className="block truncate text-sm font-bold text-ink-700 hover:text-gold-700 sm:text-base">
              {organization.name}
            </Link>
            <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[11px] text-slate/60"><svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" strokeLinecap="round" /></svg>{organization.code}</p>
          </div>
        </div>
        <div className="shrink-0 text-right"><Badge variant={organization.is_active ? "default" : "destructive"}>{organization.is_active ? "Active" : "Inactive"}</Badge></div>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-1.5"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate/60" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 11a2.5 2.5 0 1 0 0-5M16 14.5c2.3 0 3.9 1.2 4.5 3.5" strokeLinecap="round" /></svg><div className="min-w-0"><dt className="font-medium text-slate/50">Branches</dt><dd className="truncate font-semibold text-ink-700"><OrganizationBranchesModal organizationName={organization.name} schools={schools} showLabel /></dd></div></div>
        <div className="flex min-w-0 items-center gap-1.5"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate/60" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" strokeLinecap="round" /></svg><div className="min-w-0"><dt className="font-medium text-slate/50">Account</dt><dd className="truncate font-semibold text-ink-700">Organization</dd></div></div>
      </dl>
      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
        <div className="min-w-0 rounded-lg bg-slate-50/80 px-2.5 py-2"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate/50">Remark</p><div className="min-w-0"><StatusHistoryModal title={organization.name} items={history} /></div></div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] text-slate/60">Created Date: <span className="font-semibold text-ink-700">{formatCreatedAt(organization.created_at)}</span></p>
        <div className="flex shrink-0 gap-1.5">
        <Link href={`/organization-master/${organization.id}`}><Button size="sm" variant="outline" className="min-h-9 w-9 rounded-lg px-0 text-sm" aria-label="View organization" title="View organization"><span aria-hidden="true">↗</span></Button></Link>
        <Link href={`/organization-master/${organization.id}/edit`}><Button size="sm" variant="outline" className="min-h-9 w-9 rounded-lg px-0 text-sm" aria-label="Edit organization" title="Edit organization"><span aria-hidden="true">✎</span></Button></Link>
        {organization.is_active ? <OrganizationStatusModal id={organization.id} name={organization.name} compact /> : <OrganizationStatusModal id={organization.id} name={organization.name} compact activate />}
        </div>
        </div>
      </div>
    </article>
  );
}

export default async function OrganizationMasterPage({ searchParams }: { searchParams: SearchParams }) {
  let role: string;
  try { ({ role } = await requirePageAccess("organization_master")); } catch { redirect("/dashboard"); }
  const supabase = await createClient();
  // Super Admins manage the complete organization directory. Other roles stay
  // on the normal RLS-scoped client so tenant isolation remains unchanged.
  const dataClient = role === "super_admin" ? createAdminClient() : supabase;
  const queryText = searchParams.q?.trim() ?? "";
  let organizationsQuery = dataClient.from("organizations").select("id, code, name, is_active, inactive_reason, created_at").order("created_at", { ascending: false });
  if (queryText) { const safeQuery = queryText.replace(/[,()]/g, ""); organizationsQuery = organizationsQuery.or(`name.ilike.%${safeQuery}%,code.ilike.%${safeQuery}%`); }
  if (searchParams.status === "active") organizationsQuery = organizationsQuery.eq("is_active", true);
  if (searchParams.status === "inactive") organizationsQuery = organizationsQuery.eq("is_active", false);
  let { data: organizations, error: organizationsError } = await organizationsQuery;
  if (organizationsError) {
    let fallbackQuery = dataClient.from("organizations").select("id, code, name, is_active, created_at").order("created_at", { ascending: false });
    if (queryText) { const safeQuery = queryText.replace(/[,()]/g, ""); fallbackQuery = fallbackQuery.or(`name.ilike.%${safeQuery}%,code.ilike.%${safeQuery}%`); }
    if (searchParams.status === "active") fallbackQuery = fallbackQuery.eq("is_active", true);
    if (searchParams.status === "inactive") fallbackQuery = fallbackQuery.eq("is_active", false);
    const fallbackResult = await fallbackQuery;
    organizations = fallbackResult.data?.map((organization) => ({ ...organization, inactive_reason: null })) ?? null;
    organizationsError = fallbackResult.error;
  }
  const { data: schools } = await dataClient.from("schools").select("id, organization_id, code, name, slug, is_active");
  const { data: statusHistory } = await dataClient.from("organization_status_history").select("id, organization_id, status, reason, created_at, created_by").order("created_at", { ascending: false });
  const organizationCreatorIds = [...new Set((statusHistory ?? []).map((item) => item.created_by).filter(Boolean))] as string[];
  const { data: organizationCreators } = organizationCreatorIds.length ? await createAdminClient().from("profiles").select("id, full_name").in("id", organizationCreatorIds) : { data: [] as { id: string; full_name: string | null }[] };
  const organizationCreatorNames = new Map((organizationCreators ?? []).map((profile) => [profile.id, profile.full_name]));
  const schoolsByOrganization = new Map<string, { id: string; code: string; name: string; slug?: string | null; is_active: boolean }[]>();
  const historyByOrganization = new Map<string, StatusHistoryItem[]>();
  (schools ?? []).forEach((school) => { const organizationSchools = schoolsByOrganization.get(school.organization_id) ?? []; organizationSchools.push(school); schoolsByOrganization.set(school.organization_id, organizationSchools); });
  (statusHistory ?? []).forEach((item) => { const organizationHistory = historyByOrganization.get(item.organization_id) ?? []; organizationHistory.push({ ...item, created_by: item.created_by ? organizationCreatorNames.get(item.created_by) ?? "Unknown user" : "Unknown user" } as StatusHistoryItem); historyByOrganization.set(item.organization_id, organizationHistory); });
  const allOrganizations = organizations ?? [];
  const activeCount = allOrganizations.filter((organization) => organization.is_active).length;
  const inactiveCount = allOrganizations.length - activeCount;
  const hasFilters = Boolean(queryText || searchParams.status);

  return (
    <div className="-mx-2 -mt-2 min-w-0 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4">
      <div className="mb-3 flex min-w-0 flex-row items-center justify-between gap-2 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2.5 shadow-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg text-ink-700">⌂</div><div className="min-w-0"><h1 className="truncate font-display text-lg font-semibold text-ink-700 sm:text-xl">Organization Master</h1></div></div>
        <div className="w-auto shrink-0"><OrganizationCreateModal /></div>
      </div>
      <div className="mb-3 grid grid-cols-2 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-4 xl:gap-4">
        <SummaryCard title="Total organizations" count={allOrganizations.length} subtitle="All organization records" tone="border-gray-200 border-l-ink-700" icon={<span className="text-lg">◎</span>} />
        <SummaryCard title="Active" count={activeCount} subtitle="Currently available" tone="border-emerald-200 border-l-emerald-500" icon={<span className="text-lg text-emerald-600">✓</span>} />
        <SummaryCard title="Inactive" count={inactiveCount} subtitle="Not currently available" tone="border-rose-200 border-l-rose-500" icon={<span className="text-lg text-rose-600">−</span>} />
        <SummaryCard title="School branches" count={schools?.length ?? 0} subtitle="Across all organizations" tone="border-amber-200 border-l-amber-500" icon={<span className="text-lg text-amber-600">⌂</span>} />
      </div>
      <Card className="mt-0 overflow-hidden rounded-2xl border border-ink-100 !p-0 shadow-[0_8px_30px_rgba(30,42,74,0.08)] ring-1 ring-ink-50">
        <div className="flex flex-col gap-3 border-b-2 border-ink-100 bg-gradient-to-r from-white to-ink-50/40 px-2 py-3 sm:px-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-lg text-white shadow-sm">◎</div><div><h2 className="font-display text-lg font-semibold text-ink-700">Organizations</h2><p className="text-xs text-slate/60">Manage organizations and their school branches.</p></div></div><span className="shrink-0 rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-700">{allOrganizations.length} shown</span></div>
        <OrganizationFilters>
          <form className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center lg:max-w-[575px]" method="get">
          <div className="relative min-w-0 flex-1"><label htmlFor="organization-search" className="sr-only">Search organizations</label><Input id="organization-search" name="q" defaultValue={queryText} placeholder="Search organization name or code" className="mt-0 min-h-10 pr-10" /><OrganizationFilterProcessing field="q" /></div>
          <div className="relative w-full sm:w-44"><label htmlFor="organization-status" className="sr-only">Filter by status</label><select id="organization-status" name="status" defaultValue={searchParams.status ?? ""} className="min-h-10 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 pr-10 text-sm text-ink-700 shadow-sm"><option value="">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select><OrganizationFilterProcessing field="status" /></div>
          <div className="flex gap-2">{hasFilters && <Link href="/organization-master" className="flex-1 sm:flex-none"><Button type="button" variant="ghost" className="min-h-10 w-full bg-white">Clear</Button></Link>}</div>
          </form>
        </OrganizationFilters>
        </div>
        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 md:hidden">
          {allOrganizations.map((organization) => <OrganizationCard key={organization.id} organization={organization} schools={schoolsByOrganization.get(organization.id) ?? []} history={historyByOrganization.get(organization.id) ?? []} />)}
        </div>
        <div className="hidden overflow-hidden px-1 pb-2 sm:px-2 md:block">
          <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[15%]" /><col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[9%]" /><col className="w-[15%]" /><col className="w-[19%]" /><col className="w-[25%]" /></colgroup>
            <thead><tr className="border-b-2 border-ink-200 bg-ink-700 text-[10px] uppercase tracking-[0.14em] text-white"><th className="px-2 py-2.5 sm:px-3">Organization</th><th className="px-2 py-2.5 sm:px-3">Code</th><th className="px-2 py-2.5 sm:px-3">Branches</th><th className="px-2 py-2.5 sm:px-3">Status</th><th className="px-2 py-2.5 sm:px-3">Created</th><th className="px-2 py-2.5 sm:px-3">Remark</th><th className="px-2 py-2.5 sm:px-3">Actions</th></tr></thead>
            <tbody>{allOrganizations.map((organization) => <tr key={organization.id} className="border-b border-ink-100 odd:bg-white even:bg-ink-50/50 transition-colors hover:bg-gold-50/60 last:border-0"><td className="px-2 py-2.5 sm:px-3"><Link href={`/organization-master/${organization.id}`} className="font-semibold text-ink-700 hover:text-gold-700">{organization.name}</Link><p className="mt-1 text-xs text-slate/55">Organization account</p></td><td className="px-2 py-2.5 font-mono text-xs font-bold tracking-wide text-slate/75 sm:px-3">{organization.code}</td><td className="px-2 py-2.5 sm:px-3"><OrganizationBranchesModal organizationName={organization.name} schools={schoolsByOrganization.get(organization.id) ?? []} /></td><td className="px-2 py-2.5 sm:px-3"><Badge variant={organization.is_active ? "default" : "destructive"}>{organization.is_active ? "Active" : "Inactive"}</Badge></td><td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate/70 sm:px-3">{formatCreatedAt(organization.created_at)}</td><td className="px-2 py-2.5 sm:px-3"><StatusHistoryModal title={organization.name} items={historyByOrganization.get(organization.id) ?? []} /></td><td className="px-2 py-2.5 sm:px-3"><div className="flex flex-nowrap gap-1.5"><Link href={`/organization-master/${organization.id}`}><Button size="sm" variant="outline" aria-label="View organization" title="View organization">↗ View</Button></Link><Link href={`/organization-master/${organization.id}/edit`}><Button size="sm" variant="outline" aria-label="Edit organization" title="Edit organization">✎ Edit</Button></Link><OrganizationStatusModal id={organization.id} name={organization.name} activate={!organization.is_active} /></div></td></tr>)}</tbody>
          </table>
        </div>
        {allOrganizations.length === 0 && <div className="px-6 py-12 text-center"><p className="font-semibold text-ink-700">No organizations found</p><p className="mt-1 text-sm text-slate/60">Try changing your search or status filter.</p></div>}
      </Card>
    </div>
  );
}
