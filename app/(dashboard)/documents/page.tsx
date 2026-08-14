import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { DocumentConfiguration } from "@/components/documents/document-configuration";
import {
  canViewDocumentAudit,
  getDocumentActor,
  getDocumentOverviewCounts,
  getDocumentSettings,
  getMissingRequiredDocumentCount,
  listDocumentCategories,
  listDocumentDashboard,
  listRecentDocumentActivity,
} from "@/lib/documents";
import { requirePageAccess } from "@/lib/require-role";
import { DOCUMENT_STATUSES, DOCUMENT_SUBJECT_TYPES, type DocumentSubjectType } from "@/lib/security/documents";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === "string" ? value : undefined;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    await requirePageAccess("documents");
  } catch {
    redirect("/dashboard");
  }
  const actor = await getDocumentActor();
  if (!actor) redirect("/login");
  const canBrowseStudents = actor.role === "super_admin" || actor.permissions.has("view_student_documents") || actor.permissions.has("manage_student_documents");
  const canBrowseStaff = actor.role === "super_admin" || actor.permissions.has("view_staff_documents") || actor.permissions.has("manage_staff_documents");
  if (!canBrowseStudents && !canBrowseStaff) redirect("/dashboard");

  const requestedSubject = valueOf(searchParams, "subject");
  const subjectType: DocumentSubjectType = requestedSubject === "staff" && canBrowseStaff
    ? "staff"
    : canBrowseStudents ? "student" : "staff";
  const rawPage = Number(valueOf(searchParams, "page") ?? "1");
  const rawPerPage = Number(valueOf(searchParams, "perPage") ?? "10");
  const filters = {
    query: valueOf(searchParams, "q"), categoryId: valueOf(searchParams, "category"), status: valueOf(searchParams, "status"), fileType: valueOf(searchParams, "type"),
    uploadedFrom: valueOf(searchParams, "from"), uploadedTo: valueOf(searchParams, "to"),
    expiry: ["all", "expired", "soon"].includes(valueOf(searchParams, "expiry") ?? "") ? valueOf(searchParams, "expiry") as "all" | "expired" | "soon" : "all",
    sort: ["newest", "oldest", "name", "expiry"].includes(valueOf(searchParams, "sort") ?? "") ? valueOf(searchParams, "sort") as "newest" | "oldest" | "name" | "expiry" : "newest",
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    perPage: [10, 25, 50].includes(rawPerPage) ? rawPerPage : 10,
  };
  const canAudit = canViewDocumentAudit(actor);
  const [dashboard, categories, overview, activity] = await Promise.all([
    listDocumentDashboard(subjectType, filters),
    listDocumentCategories(subjectType),
    getDocumentOverviewCounts(subjectType),
    canAudit ? listRecentDocumentActivity(subjectType, 20) : Promise.resolve([]),
  ]);
  const [missingRequired, allCategories, settings] = actor.role === "super_admin"
    ? await Promise.all([
      getMissingRequiredDocumentCount(subjectType),
      Promise.all([listDocumentCategories("student"), listDocumentCategories("staff")]).then(([students, staff]) => [...students, ...staff]),
      getDocumentSettings(),
    ])
    : [null, [], null] as const;
  const totalPages = Math.max(1, Math.ceil(dashboard.count / dashboard.perPage));

  function pageHref(page: number) {
    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === "string" && value) query.set(key, value);
    });
    query.set("subject", subjectType);
    query.set("page", String(Math.min(Math.max(page, 1), totalPages)));
    return `/documents?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Secure records</p><h1 className="mt-2 font-display text-2xl text-ink-700">Document dashboard</h1><p className="mt-1 text-sm text-slate/60">Search authorized records, monitor expiring files, and open an auditable secure preview.</p></div>{actor.role === "super_admin" && <Badge>Super Admin controls enabled</Badge>}</div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate/60">Matching documents</p><p className="mt-2 font-display text-3xl text-ink-700">{dashboard.count}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate/60">Expired</p><p className="mt-2 font-display text-3xl text-danger">{overview.expired}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate/60">Due in {overview.reminderDays} days</p><p className="mt-2 font-display text-3xl text-gold-700">{overview.expiringSoon}</p></Card>{missingRequired !== null && <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate/60">Required files missing</p><p className="mt-2 font-display text-3xl text-ink-700">{missingRequired}</p></Card>}</div>

      <Card>
        <form action="/documents" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label>Record type</Label><select name="subject" defaultValue={subjectType} className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm">{canBrowseStudents && <option value="student">Students</option>}{canBrowseStaff && <option value="staff">Staff</option>}</select></div>
          <div><Label>Search</Label><Input name="q" defaultValue={filters.query} placeholder="Name, ID, or document" /></div>
          <div><Label>Category</Label><select name="category" defaultValue={filters.categoryId ?? ""} className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><Label>Status</Label><select name="status" defaultValue={filters.status ?? ""} className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"><option value="">All statuses</option>{DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
          <div><Label>Expiry</Label><select name="expiry" defaultValue={filters.expiry} className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"><option value="all">Any expiry</option><option value="expired">Expired</option><option value="soon">Expiring soon</option></select></div>
          <div><Label>Uploaded from</Label><Input name="from" type="date" defaultValue={filters.uploadedFrom} /></div>
          <div><Label>Uploaded to</Label><Input name="to" type="date" defaultValue={filters.uploadedTo} /></div>
          <div><Label>Sort</Label><select name="sort" defaultValue={filters.sort} className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Document name</option><option value="expiry">Expiry date</option></select></div>
          <input type="hidden" name="perPage" value={filters.perPage} />
          <div className="flex gap-2 lg:col-span-4"><Button type="submit">Apply filters</Button><Link href={`/documents?subject=${subjectType}`}><Button type="button" variant="ghost">Clear filters</Button></Link></div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-ink-50 text-xs uppercase tracking-wide text-slate/60"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Document</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{dashboard.rows.map((document) => <tr key={document.id} className="border-t border-ink-100 align-top"><td className="px-4 py-3"><Link className="font-semibold text-ink-700 hover:underline" href={subjectType === "student" ? `/students/${document.subjectId}` : `/staff/${document.subjectId}/documents`}>{document.subjectName}</Link><p className="mt-1 font-mono text-xs text-slate/50">{document.subjectReference ?? "—"}</p></td><td className="px-4 py-3"><p className="font-semibold text-ink-700">{document.title}</p><p className="mt-1 max-w-48 truncate text-xs text-slate/60" title={document.originalFileName}>{document.originalFileName}</p></td><td className="px-4 py-3">{document.category?.name ?? "—"}</td><td className="px-4 py-3"><Badge className={document.effectiveStatus === "expired" || document.effectiveStatus === "rejected" ? "bg-danger/10 text-danger" : document.effectiveStatus === "approved" ? "bg-success/10 text-success" : ""}>{statusLabel(document.effectiveStatus)}</Badge></td><td className="px-4 py-3 whitespace-nowrap">{new Date(document.uploadedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td><td className="px-4 py-3 whitespace-nowrap">{document.expiryDate ? new Date(`${document.expiryDate}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</td><td className="px-4 py-3"><a className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" href={`/api/documents/${subjectType}/${document.id}/content`} target="_blank" rel="noreferrer">Preview</a><a className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" href={`/api/documents/${subjectType}/${document.id}/content?download=1`}>Download</a></td></tr>)}{!dashboard.rows.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate/60">No documents match the selected filters.</td></tr>}</tbody></table></div>{totalPages > 1 && <div className="flex items-center justify-center gap-2 border-t border-ink-100 px-4 py-3 text-sm"><Link href={pageHref(dashboard.page - 1)} aria-disabled={dashboard.page <= 1} className={dashboard.page <= 1 ? "pointer-events-none text-slate/40" : "font-semibold text-ink-700"}>Previous</Link><span>Page {dashboard.page} of {totalPages}</span><Link href={pageHref(dashboard.page + 1)} aria-disabled={dashboard.page >= totalPages} className={dashboard.page >= totalPages ? "pointer-events-none text-slate/40" : "font-semibold text-ink-700"}>Next</Link></div>}</Card>

      {canAudit && <Card><h2 className="font-display text-xl text-ink-700">Recent document activity</h2><p className="mt-1 text-sm text-slate/60">Access, downloads, lifecycle changes, and replacements are append-only audit events.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-slate/60"><th className="py-3 pr-4">Action</th><th className="py-3 pr-4">Category</th><th className="py-3 pr-4">Performed by</th><th className="py-3">Time</th></tr></thead><tbody>{activity.map((entry) => <tr key={entry.id} className="border-b border-ink-100 last:border-0"><td className="py-3 pr-4 font-medium text-ink-700">{statusLabel(entry.action)}</td><td className="py-3 pr-4">{entry.categoryName ?? "—"}</td><td className="py-3 pr-4">{entry.performedByName ?? "System / legacy"}</td><td className="py-3 whitespace-nowrap">{formatDate(entry.createdAt)}</td></tr>)}{!activity.length && <tr><td colSpan={4} className="py-8 text-center text-slate/60">No recent activity is available.</td></tr>}</tbody></table></div></Card>}

      {actor.role === "super_admin" && settings && <Card><h2 className="font-display text-xl text-ink-700">Document configuration</h2><p className="mt-1 text-sm text-slate/60">These settings are bounded to safe file formats and sizes and affect subsequent uploads.</p><div className="mt-5"><DocumentConfiguration categories={allCategories} maxFileSizeBytes={settings.maxFileSizeBytes} allowedFileTypes={settings.allowedFileTypes} expiryReminderDays={settings.expiryReminderDays} /></div></Card>}
    </div>
  );
}
