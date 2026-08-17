import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { getLeavingRequestDetails } from "@/lib/leaving-students-service";
import { LEAVING_REASON_LABELS, LeavingReason } from "@/lib/leaving-students";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function CertificatePrintPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    await requirePageAccess("leaving_students");
  } catch {
    redirect("/dashboard");
  }

  const details = await getLeavingRequestDetails(params.id);
  if (!details || !details.request.certificate_number) notFound();

  const { request } = details;

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 print:p-0 print:bg-white">
      <div className="mx-auto max-w-4xl bg-white p-8 shadow-lg print:shadow-none print:max-w-none border-4 border-double border-slate-800">
        {/* Printable Action Bar */}
        <div className="mb-6 flex justify-between items-center border-b pb-4 print:hidden">
          <span className="text-sm font-semibold text-slate-600">Official Transfer Certificate Document</span>
          <PrintButton />
        </div>

        {/* Certificate Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-800 pb-6">
          <h1 className="font-serif text-3xl font-bold uppercase tracking-wide text-slate-900">
            DEMO INTERNATIONAL SCHOOL
          </h1>
          <p className="text-xs text-slate-600 uppercase tracking-widest">
            Recognized by Ministry of Education · Affiliation No. 109283
          </p>
          <p className="text-xs text-slate-500">
            School Code: 40912 · Address: Educational Complex, Knowledge Park, City
          </p>
          <div className="pt-4">
            <span className="inline-block border-2 border-slate-900 px-6 py-1 font-serif text-xl font-bold uppercase tracking-wider">
              TRANSFER / LEAVING CERTIFICATE
            </span>
          </div>
        </div>

        {/* Certificate Numbers */}
        <div className="mt-6 flex justify-between font-mono text-sm font-bold text-slate-800">
          <div>TC No: <span className="underline">{request.certificate_number}</span></div>
          <div>Admission No: <span className="underline">{request.admission_number}</span></div>
        </div>

        {/* Body Content */}
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-slate-800 font-serif">
          <p>
            This is to certify that <span className="font-bold text-base underline">{request.student_name}</span>, 
            son/daughter of Shri <span className="font-bold underline">{request.father_name || "N/A"}</span> 
            and Smt. <span className="font-bold underline">{request.mother_name || "N/A"}</span>, 
            was admitted to this school on <span className="font-bold underline">{formatDate(request.admission_date)}</span> 
            and left the school on <span className="font-bold underline">{formatDate(request.leaving_date)}</span>.
          </p>

          <div className="grid grid-cols-2 gap-4 border-y border-slate-300 py-4">
            <div>
              <span className="text-slate-600 text-xs uppercase block">Class at time of leaving:</span>
              <span className="font-bold">
                {(request.classes as any)?.name} {(request.sections as any)?.name ? `- ${(request.sections as any).name}` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-xs uppercase block">Academic Session:</span>
              <span className="font-bold">{(request.academic_sessions as any)?.name}</span>
            </div>
            <div>
              <span className="text-slate-600 text-xs uppercase block">Reason for leaving:</span>
              <span className="font-bold">{LEAVING_REASON_LABELS[request.reason as LeavingReason]}</span>
            </div>
            <div>
              <span className="text-slate-600 text-xs uppercase block">Overall Dues Clearance:</span>
              <span className="font-bold uppercase text-emerald-700">{request.overall_clearance_status}</span>
            </div>
          </div>

          <p>
            He/She has paid all dues up to the date of leaving. His/Her conduct and character during his/her stay in the school have been <span className="font-bold underline">GOOD</span>.
          </p>

          {request.detailed_remarks && (
            <p className="text-xs italic text-slate-600">
              Remarks: {request.detailed_remarks}
            </p>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-20 grid grid-cols-3 text-center text-xs font-bold text-slate-800 pt-8">
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

        {/* Date of Issue */}
        <div className="mt-8 text-xs text-slate-500 font-mono text-right">
          Date of Issue: {formatDate(request.certificate_generated_at)}
        </div>
      </div>
    </div>
  );
}
