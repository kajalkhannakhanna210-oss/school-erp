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
import { DocumentUpload, type DocumentRow } from "./document-upload";
import { PhotoUpload } from "./photo-upload";

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

  const { data: documents } = await supabase
    .from("student_documents")
    .select("id, file_name, file_path")
    .eq("student_id", params.id)
    .order("uploaded_at", { ascending: false });

  const documentsWithUrls: DocumentRow[] = await Promise.all(
    (documents ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(d.file_path, 60 * 10);
      return { id: d.id, file_name: d.file_name, signedUrl: signed?.signedUrl ?? null };
    })
  );

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
      <div className="flex flex-col gap-4 rounded-xl border border-ink-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Student profile</p>
          <h1 className="mt-2 break-words font-display text-3xl font-semibold text-ink-700">{s.profiles?.full_name}</h1>
          <p className="mt-2 break-words text-sm text-slate/60">
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
        {canManage && (
          <div className="flex flex-col gap-2 rounded-xl border border-gold-200 bg-gold-50/60 p-2.5 sm:shrink-0"><p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-700">Quick actions</p><div className="flex flex-wrap gap-2">
            <Link href="/students"><Button variant="primary">← Back to student list</Button></Link>
            <Link href={`/students/${s.id}/edit`}>
              <Button>Edit student</Button>
            </Link>
            <ArchiveControl studentId={s.id} isActive={s.is_active} />
          </div></div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-ink-100 shadow-sm lg:col-span-1">
          <h2 className="font-display text-xl font-semibold text-ink-700">Student photo</h2>
          <div className="mx-auto mt-5 flex aspect-square w-full max-w-56 items-center justify-center overflow-hidden rounded-xl border border-gold-200 bg-gold-50/40">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={s.profiles?.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate/40">No photo</span>
            )}
          </div>
          {canManage && (
            <div className="mt-4">
              <PhotoUpload studentId={s.id} />
            </div>
          )}
        </Card>

        <Card className="border-ink-100 shadow-sm lg:col-span-2">
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

        <Card className="border-ink-100 shadow-sm lg:col-span-3">
          <h2 className="font-display text-xl font-semibold text-ink-700">Documents</h2>
          <div className="mt-4">
            <DocumentUpload studentId={s.id} documents={documentsWithUrls} canManage={canManage} />
          </div>
        </Card>

        {canViewFees && (
          <div className="lg:col-span-3">
            <h2 className="font-display text-lg text-ink-700">Fees</h2>
            <div className="mt-4">
              <FeeSummary studentId={s.id} lines={feeLines} canManage={canManage} />
            </div>
          </div>
        )}

        {canViewFees && (
          <div className="lg:col-span-3">
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
