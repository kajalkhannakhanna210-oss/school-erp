import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { getStaffPerformanceData } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export default async function StaffPerformancePage() {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser?.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.user.id).maybeSingle();
  const rows = await getStaffPerformanceData(supabase, profile?.role === "super_admin");

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">Admission Enquiries</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-700">Staff Performance</h1>
          <p className="mt-1 text-sm text-slate/70">Assignment, follow-up, outcome, and conversion performance.</p>
        </div>
        <Link href="/enquiries" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-sm hover:bg-ink-50">← Back to enquiries</Link>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-slate/60">
              <tr>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Enquiry Scope / Classes</th>
                <th className="px-4 py-3 text-right">Assigned</th>
                <th className="px-4 py-3 text-right">Pending Follow-ups</th>
                <th className="px-4 py-3 text-right">Overdue</th>
                <th className="px-4 py-3 text-right">Interested</th>
                <th className="px-4 py-3 text-right">Won</th>
                <th className="px-4 py-3 text-right">Lost</th>
                <th className="px-4 py-3 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100/70">
              {rows.map((row) => (
                <tr key={row.staffId} className="hover:bg-ink-50/40">
                  <td className="px-4 py-3 font-semibold text-ink-700">{row.staffName}</td>
                  <td className="max-w-xs px-4 py-3 text-slate/70">{row.scope}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-700">{row.totalAssigned}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{row.pendingFollowups}</td>
                  <td className="px-4 py-3 text-right text-rose-700">{row.overdueFollowups}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{row.interested}</td>
                  <td className="px-4 py-3 text-right text-green-700">{row.won}</td>
                  <td className="px-4 py-3 text-right text-rose-700">{row.lost}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink-700">{row.conversion}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate/60">No staff performance data is available for your enquiry scope.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
