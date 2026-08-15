import { NextResponse, type NextRequest } from "next/server";
import { hasReportsAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { renderReceiptPdf, type ReceiptPayment } from "./receipt-document";
import { recordAccessLog } from "@/lib/security/access-logs";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "student_id, receipt_number, amount, paid_at, razorpay_payment_id, fee_heads(name), students(admission_number, profiles(full_name), classes(name), sections(name))"
    )
    .eq("id", params.paymentId)
    .eq("status", "paid")
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const allowed = payment.student_id === user.id || (await hasReportsAccess());
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await recordAccessLog({
    userId: user.id,
    userName: profile?.full_name ?? user.email ?? null,
    email: user.email ?? null,
    role: (profile?.role as UserRole) ?? null,
    module: "Fees & Finance",
    page: "Receipt Generator",
    resource: `/api/receipts/${params.paymentId}`,
    requestMethod: "GET",
    action: "Download Receipt",
    statusCode: 200,
    request: req,
    responseTimeMs: 290,
    outcome: `Downloaded fee receipt #${payment.receipt_number} (₹${payment.amount})`,
  });

  const buffer = await renderReceiptPdf(
    payment as unknown as ReceiptPayment
  );

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${payment.receipt_number}.pdf"`,
    },
  });
}
