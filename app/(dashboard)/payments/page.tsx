import { getStudentFeeLines } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";
import { FeeSummary } from "../fees/fee-summary";
import { PaymentHistory } from "../fees/payment-history";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const lines = await getStudentFeeLines(supabase, user!.id);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Payments</h1>
      <p className="mt-1 text-sm text-slate/60">Your outstanding fees and payment history.</p>

      <div className="mt-6">
        <FeeSummary
          studentId={user!.id}
          lines={lines}
          canManage={false}
          showPayment
          studentName={profile?.full_name ?? ""}
          studentEmail={user!.email ?? ""}
        />
      </div>

      <h2 className="mt-8 font-display text-lg text-ink-700">History</h2>
      <div className="mt-4">
        <PaymentHistory studentId={user!.id} />
      </div>
    </div>
  );
}
