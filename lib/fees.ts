import type { createClient } from "@/lib/supabase/server";

export type FeeLineWithPayments = {
  fee_head_id: string;
  fee_head_name: string;
  gross_amount: number;
  frequency: "one_time" | "monthly";
  current_due_date: string | null;
  concession_type: "percentage" | "fixed" | null;
  concession_value: number;
  net_amount: number;
  late_fee: number;
  paid_amount: number;
  outstanding: number;
};

// Shared by getStudentFeeLines below and by the Pending Fees report in
// lib/reports.ts, so both places clamp a student+fee-head's remainder the
// same way rather than risking two copies of this arithmetic drifting apart.
export function buildPaidMap(payments: { student_id: string; fee_head_id: string; amount: number | string }[]) {
  const map = new Map<string, number>();
  for (const p of payments) {
    const key = `${p.student_id}:${p.fee_head_id}`;
    map.set(key, (map.get(key) ?? 0) + Number(p.amount));
  }
  return map;
}

export function computeOutstanding(
  line: { student_id: string; fee_head_id: string; net_amount: number | string; late_fee: number | string },
  paidMap: Map<string, number>
) {
  const key = `${line.student_id}:${line.fee_head_id}`;
  const paid = paidMap.get(key) ?? 0;
  const owed = Number(line.net_amount) + Number(line.late_fee);
  return Math.max(owed - paid, 0);
}

export async function getStudentFeeLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
): Promise<FeeLineWithPayments[]> {
  const [{ data: lines }, { data: paidPayments }] = await Promise.all([
    supabase.from("student_fee_line_items").select("*").eq("student_id", studentId),
    supabase.from("payments").select("fee_head_id, amount").eq("student_id", studentId).eq("status", "paid"),
  ]);

  const paidByHead = buildPaidMap(
    (paidPayments ?? []).map((p) => ({ student_id: studentId, fee_head_id: p.fee_head_id, amount: p.amount }))
  );

  return (lines ?? []).map((l: any) => ({
    ...l,
    gross_amount: Number(l.gross_amount),
    net_amount: Number(l.net_amount),
    late_fee: Number(l.late_fee),
    paid_amount: paidByHead.get(`${studentId}:${l.fee_head_id}`) ?? 0,
    outstanding: computeOutstanding({ ...l, student_id: studentId }, paidByHead),
  }));
}
