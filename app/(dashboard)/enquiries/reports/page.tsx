import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { canAccessEnquiryAction, getEnquiryReportData, getStaffOptions } from "@/lib/enquiries";
import { EnquiryReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function EnquiryReportsPage({
  searchParams,
}: {
  searchParams: {
    reportType?: "enquiry" | "followup" | "staff" | "source" | "class" | "conversion";
    session_id?: string;
    class_id?: string;
    enquiry_type?: string;
    source?: string;
    assigned_staff_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!(await canAccessEnquiryAction(supabase, authUser.user?.id, "report"))) {
    redirect("/enquiries");
  }
  const reportType = searchParams.reportType ?? "enquiry";

  const [{ data: classes }, { data: sessions }, staffList, reportData] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    getStaffOptions(supabase),
    getEnquiryReportData(supabase, reportType, searchParams),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate/60">
            <Link href="/enquiries" className="hover:text-ink-700">
              Admission Enquiries
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink-700">Analytics & Reports</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-700">Admission Enquiry Analytics & Reports</h1>
        </div>

        <Link href="/enquiries">
          <button className="rounded-lg border border-ink-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
            ← Back to Enquiries
          </button>
        </Link>
      </div>

      <EnquiryReportsClient
        reportType={reportType}
        reportData={reportData}
        classes={classes ?? []}
        sessions={sessions ?? []}
        staffList={staffList}
      />
    </div>
  );
}
