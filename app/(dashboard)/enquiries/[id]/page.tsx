import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import {
  getEnquiryById,
  getEnquiryFollowups,
  getEnquiryAssignments,
  getEnquiryAuditLogs,
  getStaffOptions,
  STATUS_COLORS,
} from "@/lib/enquiries";
import { DetailViewClient } from "./detail-view-client";

export const dynamic = "force-dynamic";

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [enquiry, followups, assignments, auditLogs, staffList] = await Promise.all([
    getEnquiryById(supabase, params.id),
    getEnquiryFollowups(supabase, params.id),
    getEnquiryAssignments(supabase, params.id),
    getEnquiryAuditLogs(supabase, params.id),
    getStaffOptions(supabase),
  ]);

  if (!enquiry) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate/60">
            <Link href="/enquiries" className="hover:text-ink-700">
              Admission Enquiries
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink-700">{enquiry.enquiry_id}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink-700">{enquiry.student_name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold border ${
                STATUS_COLORS[enquiry.status]?.bg ?? "bg-slate-100"
              } ${STATUS_COLORS[enquiry.status]?.text ?? "text-slate-700"} ${
                STATUS_COLORS[enquiry.status]?.border ?? "border-slate-200"
              }`}
            >
              {enquiry.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/enquiries/${enquiry.id}/edit`}>
            <button className="rounded-lg border border-ink-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
              ✏ Edit Details
            </button>
          </Link>
          <Link href="/enquiries">
            <button className="rounded-lg border border-ink-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
              ← Back to List
            </button>
          </Link>
        </div>
      </div>

      <DetailViewClient
        enquiry={enquiry}
        followups={followups}
        assignments={assignments}
        auditLogs={auditLogs}
        staffList={staffList}
      />
    </div>
  );
}
