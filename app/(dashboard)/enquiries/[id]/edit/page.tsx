import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { getEnquiryById } from "@/lib/enquiries";
import { EditEnquiryForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditEnquiryPage({ params }: { params: { id: string } }) {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [enquiry, { data: classes }, { data: sessions }] = await Promise.all([
    getEnquiryById(supabase, params.id),
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
  ]);

  if (!enquiry) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate/60">
            <Link href="/enquiries" className="hover:text-ink-700">
              Admission Enquiries
            </Link>
            <span>/</span>
            <Link href={`/enquiries/${enquiry.id}`} className="hover:text-ink-700">
              {enquiry.enquiry_id}
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink-700">Edit</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-700">Edit Enquiry ({enquiry.enquiry_id})</h1>
        </div>
        <Link href={`/enquiries/${enquiry.id}`}>
          <button className="rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50">
            ← Cancel
          </button>
        </Link>
      </div>

      <EditEnquiryForm
        enquiry={enquiry}
        classes={classes ?? []}
        sessions={sessions ?? []}
      />
    </div>
  );
}
