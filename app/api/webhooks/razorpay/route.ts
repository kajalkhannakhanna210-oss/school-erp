import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// react-pdf and Razorpay's SDK both expect Node APIs — pin this away from
// the Edge runtime explicitly rather than relying on the default.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Read as raw text, not .json() — signature verification is over the
  // exact bytes Razorpay sent. Re-serializing a parsed object can produce a
  // byte-for-byte different string (key order, whitespace) and silently
  // break verification.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureValid =
    signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const admin = createAdminClient();

  if (event.event === "payment.captured") {
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: payment } = await admin
      .from("payments")
      .select("id, status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    // If it's already 'paid', this is a duplicate delivery — Razorpay
    // explicitly documents that webhooks can be sent more than once for the
    // same event, so a plain re-check like this is what makes the handler
    // idempotent rather than double-recording the payment.
    if (payment && payment.status !== "paid") {
      const { data: receiptNumber } = await admin.rpc("generate_receipt_number");
      await admin
        .from("payments")
        .update({
          status: "paid",
          razorpay_payment_id: paymentId,
          receipt_number: receiptNumber,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
    }
  }

  if (event.event === "payment.failed") {
    const orderId = event.payload?.payment?.entity?.order_id;
    if (orderId) {
      // neq('status', 'paid') guards against a late/out-of-order 'failed'
      // webhook overwriting a payment that a 'captured' webhook already
      // confirmed — Razorpay doesn't guarantee delivery order.
      await admin.from("payments").update({ status: "failed" }).eq("razorpay_order_id", orderId).neq("status", "paid");
    }
  }

  return NextResponse.json({ received: true });
}
