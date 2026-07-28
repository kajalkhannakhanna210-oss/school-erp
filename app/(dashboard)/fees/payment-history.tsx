import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  created: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
};

export async function PaymentHistory({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, paid_at, receipt_number, fee_heads(name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const rows = (payments ?? []) as any[];

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
            <th className="py-2">Fee Head</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Status</th>
            <th className="py-2">Date</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-ink-100 last:border-0">
              <td className="py-2">{p.fee_heads?.name}</td>
              <td className="py-2 font-mono">₹{Number(p.amount).toFixed(2)}</td>
              <td className="py-2">
                <Badge>{STATUS_LABELS[p.status] ?? p.status}</Badge>
              </td>
              <td className="py-2 text-slate/70">
                {p.status === "paid" && p.paid_at
                  ? new Date(p.paid_at).toLocaleDateString()
                  : new Date(p.created_at).toLocaleDateString()}
              </td>
              <td className="py-2 text-right">
                {p.status === "paid" && (
                  <a href={`/api/receipts/${p.id}`} className="text-ink-600 hover:underline">
                    Download receipt
                  </a>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate/50">
                No payments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
