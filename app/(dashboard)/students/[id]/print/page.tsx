import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/(dashboard)/leaving-students/[id]/print/print-button";
import { listDocumentsForSubject } from "@/lib/documents";

export const dynamic = "force-dynamic";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function StudentInfoPrintPage({ params }: { params: { id: string } }) {
  try {
    await requirePageAccess("students");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*, profiles(full_name), classes(name), sections(name), academic_sessions(name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!student) notFound();

  const documents = await listDocumentsForSubject("student", params.id);

  const s: any = student;

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 print:p-0 print:bg-white">
      <div className="mx-auto max-w-4xl bg-white p-8 shadow-lg print:shadow-none print:max-w-none border-4 border-double border-slate-800">
        {/* Printable Action Bar */}
        <div className="mb-6 flex justify-between items-center border-b pb-4 print:hidden">
          <span className="text-sm font-semibold text-slate-600">Student Information Sheet</span>
          <PrintButton />
        </div>

        {/* Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-800 pb-6">
          <h1 className="font-serif text-3xl font-bold uppercase tracking-wide text-slate-900">DEMO INTERNATIONAL SCHOOL</h1>
          <p className="text-xs text-slate-600 uppercase tracking-widest">School Address · Contact · Email</p>
          <div className="pt-4">
            <span className="inline-block border-2 border-slate-900 px-6 py-1 font-serif text-xl font-bold uppercase tracking-wider">STUDENT INFORMATION SHEET</span>
          </div>
        </div>

        {/* Student Summary Row */}
        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 overflow-hidden rounded border border-slate-200 bg-ink-50" style={{ aspectRatio: "1/1" }}>
              {s.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={await (async () => {
                  const { data: signed } = await supabase.storage.from("student-photos").createSignedUrl(s.photo_path, 60 * 10);
                  return signed?.signedUrl ?? "";
                })()} alt={s.profiles?.full_name} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><span className="text-xs text-slate/40">No photo</span></div>
              )}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink-700">{s.profiles?.full_name}</h2>
              <div className="mt-1 text-xs text-slate-600 font-mono">
                <div>Student ID: {s.id}</div>
                <div>Admission No: {s.admission_number ?? "Not Assigned"}</div>
                <div>Academic Session: {s.academic_sessions?.name ?? "—"}</div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Student Information</dt>
              <dd className="mt-1 font-medium text-ink-700 space-y-1">
                <div><strong>Registration No:</strong> {s.registration_number ?? "—"}</div>
                <div><strong>Date of Birth:</strong> {formatDate(s.date_of_birth)}</div>
                <div><strong>Gender:</strong> {s.gender ?? "—"}</div>
                <div><strong>Blood Group:</strong> {s.blood_group ?? "—"}</div>
                <div><strong>Admission Date:</strong> {formatDate(s.admission_date)}</div>
              </dd>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Academic Information</dt>
              <dd className="mt-1 font-medium text-ink-700 space-y-1">
                <div><strong>Class:</strong> {s.classes?.name ?? "—"}</div>
                <div><strong>Section:</strong> {s.sections?.name ?? "—"}</div>
                <div><strong>Roll Number:</strong> {s.roll_number ?? "—"}</div>
                <div><strong>Status:</strong> {s.is_active ? "Active" : "Archived"}</div>
              </dd>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Parent / Guardian</dt>
              <dd className="mt-1 font-medium text-ink-700 space-y-1">
                <div><strong>Father:</strong> {s.father_name ?? "—"}</div>
                <div><strong>Mother:</strong> {s.mother_name ?? "—"}</div>
                <div><strong>Guardian:</strong> {s.guardian_name ?? "—"}</div>
                <div><strong>Mobile:</strong> {s.mobile_number ?? "—"}</div>
                <div><strong>Email:</strong> {s.contact_email ?? "—"}</div>
              </dd>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Address</dt>
              <dd className="mt-1 font-medium text-ink-700">{s.address ?? "—"}</dd>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Previous School</dt>
              <dd className="mt-1 font-medium text-ink-700 space-y-1">
                <div><strong>Previous School:</strong> {s.previous_school ?? "—"}</div>
                <div><strong>Previous Class:</strong> {s.previous_class ?? "—"}</div>
                <div><strong>Previous Board:</strong> {s.previous_board ?? "—"}</div>
              </dd>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate/50">Documents</dt>
              <dd className="mt-1 font-medium text-ink-700">{documents.length} document(s) available</dd>
            </div>
          </div>

          {/* Footer / Signatures */}
          <div className="mt-8 grid grid-cols-3 text-center text-xs font-bold text-slate-800 pt-8">
            <div>
              <div className="border-t border-slate-800 pt-1">Prepared By</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1">Checked By (Class Teacher)</div>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1">Principal (Signature & Stamp)</div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 font-mono text-right">Generated: {new Date().toLocaleString("en-IN")}</div>
        </div>
      </div>
    </div>
  );
}
