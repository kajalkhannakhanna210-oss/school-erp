import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderReceiptPdf, type ReceiptPayment } from "./receipt-document";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { paymentId: string } }) {
  const supabase = await createClient();

  // No special-casing here for who's allowed to fetch this — the same RLS
  // policy that governs the payments list (self, admin, or staff with
  // view_fee_status) governs this single-row lookup too.
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "receipt_number, amount, paid_at, razorpay_payment_id, fee_heads(name), students(admission_number, profiles(full_name), classes(name), sections(name))"
    )
    .eq("id", params.paymentId)
    .eq("status", "paid")
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const buffer = await renderReceiptPdf(payment as unknown as ReceiptPayment);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${payment.receipt_number}.pdf"`,
    },
  });
}
