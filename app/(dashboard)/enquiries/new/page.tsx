import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions } from "@/lib/enquiries";
import { EnquiryForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewEnquiryPage() {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: classes }, { data: sessions }, staffList] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    getStaffOptions(supabase),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate/60">
            <Link href="/enquiries" className="hover:text-ink-700">
              Admission Enquiries
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink-700">New Enquiry</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-700">Record New Admission Enquiry</h1>
        </div>
        <Link href="/enquiries">
          <button className="rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
            ← Back to List
          </button>
        </Link>
      </div>

      <EnquiryForm
        classes={classes ?? []}
        sessions={sessions ?? []}
        staffList={staffList}
      />
    </div>
  );
}
