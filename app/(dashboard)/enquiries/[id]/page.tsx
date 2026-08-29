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
  getEnquiryActionPermissions,
} from "@/lib/enquiries";
import { DetailViewClient } from "./detail-view-client";
import { DetailHeaderActions } from "./detail-header-actions";

export const dynamic = "force-dynamic";

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [enquiry, followups, assignments, auditLogs] = await Promise.all([
    getEnquiryById(supabase, params.id),
    getEnquiryFollowups(supabase, params.id),
    getEnquiryAssignments(supabase, params.id),
    getEnquiryAuditLogs(supabase, params.id),
  ]);

  if (!enquiry) {
    notFound();
  }

  const permissions = await getEnquiryActionPermissions(supabase, enquiry);
  const staffList = permissions.assign ? await getStaffOptions(supabase, enquiry.class_id ?? undefined) : [];

  return (
    <div className="space-y-4 lg:-mx-4 lg:-mt-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-ink-100 border-l-4 border-l-gold-500 bg-gradient-to-br from-white to-ink-50/70 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:px-5 sm:py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate/60 sm:text-xs">
            <Link href="/enquiries" className="hover:text-ink-700">
              Admission Enquiries
            </Link>
            <span>/</span>
            <span className="truncate font-semibold text-ink-700">{enquiry.enquiry_id}</span>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-base font-bold text-gold-400 shadow-sm sm:h-12 sm:w-12 sm:text-lg">
              {enquiry.student_name.trim().charAt(0).toUpperCase() || "E"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words font-display text-xl font-bold leading-tight text-ink-700 sm:text-3xl">{enquiry.student_name}</h1>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    STATUS_COLORS[enquiry.status]?.bg ?? "bg-slate-100"
                  } ${STATUS_COLORS[enquiry.status]?.text ?? "text-slate-700"} ${
                    STATUS_COLORS[enquiry.status]?.border ?? "border-slate-200"
                  }`}
                >
                  {enquiry.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate/60">Admission enquiry profile</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 border-t border-ink-100/80 pt-3 sm:w-auto sm:flex-row sm:items-center sm:border-0 sm:pt-0">
          <DetailHeaderActions enquiry={enquiry} staffList={staffList} permissions={permissions} />
          <Link href="/enquiries" className="w-full sm:w-auto">
            <button className="w-full rounded-lg border border-ink-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50 sm:w-auto">
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
        permissions={permissions}
      />
    </div>
  );
}
