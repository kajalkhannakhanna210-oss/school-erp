import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { FeeSummary } from "@/app/(dashboard)/fees/fee-summary";
import { PaymentHistory } from "@/app/(dashboard)/fees/payment-history";
import { getStudentFeeLines } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";
import { DateValue } from "@/components/date-value";
import { ArchiveControl } from "./archive-control";
import { PhotoUpload } from "./photo-upload";
import { DocumentPanel } from "@/components/documents/document-panel";
import { canManageDocument, canViewDocumentAudit, getDocumentActor, listDocumentActivity, listDocumentCategories, listDocumentsForSubject } from "@/lib/documents";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const canManage = viewerProfile?.role === "super_admin";

  let canViewFees = canManage;
  if (viewerProfile?.role === "staff") {
    const { data: permission } = await supabase
      .from("staff_permissions")
      .select("permission_key")
      .eq("staff_id", user!.id)
      .eq("permission_key", "view_fee_status")
      .maybeSingle();
    canViewFees = !!permission;
  }

  const { data: student } = await supabase
    .from("students")
    .select("*, profiles(full_name), classes(name), sections(name), academic_sessions(name)")
    .eq("id", params.id)
    .single();

  if (!student) notFound();

  const feeLines = canViewFees ? await getStudentFeeLines(supabase, params.id) : [];

  const [documentActor, documentCategories, studentDocuments] = await Promise.all([
    getDocumentActor(),
    listDocumentCategories("student"),
    listDocumentsForSubject("student", params.id),
  ]);
  const canManageDocuments = Boolean(documentActor && documentCategories.some((category) => canManageDocument(documentActor, "student", category)));
  const hasDocumentAuditAccess = Boolean(documentActor && canViewDocumentAudit(documentActor));
  const documentActivity = hasDocumentAuditAccess
    ? Object.fromEntries(await Promise.all(studentDocuments.map(async (document) => [document.id, await listDocumentActivity("student", document.id)])))
    : {};

  let photoUrl: string | null = null;
  if ((student as any).photo_path) {
    const { data: signed } = await supabase.storage
      .from("student-photos")
      .createSignedUrl((student as any).photo_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  const s = student as any;

  return (
    <div className="min-w-0">
      <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Student profile</p>
            <h1 className="mt-2 break-words font-display text-2xl font-semibold text-ink-700 sm:text-3xl">{s.profiles?.full_name}</h1>
            <p className="mt-2 break-words text-xs text-slate/60 sm:text-sm">
              <span className="font-mono">{s.admission_number}</span> · {s.classes?.name}
              {s.sections?.name && ` - ${s.sections.name}`} · {s.academic_sessions?.name}
              {!s.is_active && (
                <>
                  {" "}
                  · <Badge>Archived</Badge>
                </>
              )}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Link href="/students" className="flex-1 sm:flex-none">
              <Button variant="primary" className="w-full sm:w-auto">← Back to student list</Button>
            </Link>
            <Link href={`/students/${s.id}/edit`} className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto">Edit student</Button>
            </Link>
            <div className="flex-1 sm:flex-none">
              <ArchiveControl studentId={s.id} isActive={s.is_active} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="border-ink-100 shadow-sm md:col-span-1">
          <h2 className="font-display text-xl font-semibold text-ink-700">Student photo</h2>
          <div className="mx-auto mt-5 w-full max-w-full md:max-w-56 overflow-hidden rounded-xl border border-gold-200 bg-gold-50/40" style={{ aspectRatio: "1/1" }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={photoUrl} 
                alt={s.profiles?.full_name} 
                className="h-full w-full object-cover object-center" 
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><span className="text-xs text-slate/40">No photo</span></div>
            )}
          </div>
          {canManage && (
            <div className="mt-4">
              <PhotoUpload studentId={s.id} />
            </div>
          )}
        </Card>

        <Card className="border-ink-100 shadow-sm md:col-span-2">
          <h2 className="font-display text-xl font-semibold text-ink-700">Student details</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Roll number" value={s.roll_number} />
            <Field label="Gender" value={s.gender} />
            <Field label="Date of birth" value={s.date_of_birth} />
            <Field label="Blood group" value={s.blood_group} />
            <Field label="Father's name" value={s.father_name} />
            <Field label="Mother's name" value={s.mother_name} />
            <Field label="Mobile" value={s.mobile_number} />
            <Field label="Contact email" value={s.contact_email} />
            <Field label="Address" value={s.address} />
            <Field label="Admission date" value={<DateValue value={s.admission_date} />} />
          </dl>
        </Card>

        <Card className="border-ink-100 shadow-sm md:col-span-3">
          <h2 className="font-display text-xl font-semibold text-ink-700">Documents</h2>
          <div className="mt-4">
            <DocumentPanel
              subjectType="student"
              subjectId={s.id}
              documents={studentDocuments}
              categories={documentCategories}
              canManage={canManageDocuments}
              canDelete={documentActor?.role === "super_admin"}
              canViewAudit={hasDocumentAuditAccess}
              activityByDocument={documentActivity}
            />
          </div>
        </Card>

        {canViewFees && (
          <div className="md:col-span-3">
            <h2 className="font-display text-lg text-ink-700">Fees</h2>
            <div className="mt-4">
              <FeeSummary studentId={s.id} lines={feeLines} canManage={canManage} />
            </div>
          </div>
        )}

        {canViewFees && (
          <div className="md:col-span-3">
            <h2 className="font-display text-lg text-ink-700">Payment History</h2>
            <div className="mt-4">
              <PaymentHistory studentId={s.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink-700">{value || "—"}</dd>
    </div>
  );
}
