import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { DocumentPanel } from "@/components/documents/document-panel";
import { canManageDocument, canViewDocumentAudit, getDocumentActor, listDocumentActivity, listDocumentCategories, listDocumentsForSubject } from "@/lib/documents";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function StaffDocumentsPage({ params }: { params: { id: string } }) {
  const actor = await getDocumentActor();
  if (!actor) redirect("/login");
  const hasStaffDocumentScope = actor.role === "super_admin" || actor.userId === params.id || actor.permissions.has("view_staff_documents") || actor.permissions.has("manage_staff_documents");
  if (!hasStaffDocumentScope) redirect("/dashboard");

  const { data: member } = await createAdminClient()
    .from("staff")
    .select("id, employee_id, profiles(full_name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!member) notFound();

  const [categories, documents] = await Promise.all([
    listDocumentCategories("staff"),
    listDocumentsForSubject("staff", params.id),
  ]);
  const canManage = categories.some((category) => canManageDocument(actor, "staff", category));
  const canAudit = canViewDocumentAudit(actor);
  const activity = canAudit
    ? Object.fromEntries(await Promise.all(documents.map(async (document) => [document.id, await listDocumentActivity("staff", document.id)])))
    : {};

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Staff profile</p><h1 className="mt-2 font-display text-2xl text-ink-700">{(member as any).profiles?.full_name}</h1><p className="mt-1 font-mono text-sm text-slate/60">{member.employee_id}</p></div>
        {actor.role === "super_admin" && <Link href={`/staff/${params.id}`}><Button variant="ghost">← Staff profile</Button></Link>}
      </div>
      <Card className="mt-6"><h2 className="font-display text-xl text-ink-700">Documents</h2><p className="mt-1 text-sm text-slate/60">Private employment records, versions, expiry dates, and audit history.</p><div className="mt-5"><DocumentPanel subjectType="staff" subjectId={params.id} documents={documents} categories={categories} canManage={canManage} canDelete={actor.role === "super_admin"} canViewAudit={canAudit} activityByDocument={activity} /></div></Card>
    </div>
  );
}
