"use server";

import { getStudentFeeLines } from "@/lib/fees";
import { createRazorpayClient } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

export async function createPaymentOrder(feeHeadId: string, requestedAmount: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "student") return { error: "Only a student can pay their own fees" };

  const lines = await getStudentFeeLines(supabase, user.id);
  const line = lines.find((l) => l.fee_head_id === feeHeadId);
  if (!line) return { error: "Fee not found" };
  if (line.outstanding <= 0) return { error: "Nothing outstanding for this fee" };

  // The client sends a requested amount for partial-payment UX, but it's
  // only ever a ceiling suggestion — never trusted past what's actually
  // outstanding, recomputed here from the database.
  const amount = Math.min(Math.max(Number(requestedAmount) || 0, 0), line.outstanding);
  if (amount <= 0) return { error: "Enter a valid amount" };

  const { data: session } = await supabase
    .from("academic_sessions")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (!session) return { error: "No current academic session is set — set one in Academic Structure first" };

  const razorpay = createRazorpayClient();

  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects the smallest currency unit (paise)
      currency: "INR",
      receipt: `${user.id.slice(0, 8)}-${Date.now()}`,
      notes: { student_id: user.id, fee_head_id: feeHeadId },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start the payment" };
  }

  const { error: insertError } = await supabase.from("payments").insert({
    student_id: user.id,
    fee_head_id: feeHeadId,
    session_id: session.id,
    amount,
    status: "created",
    razorpay_order_id: order.id,
  });

  if (insertError) return { error: insertError.message };

  await recordServerAction({
    action: "Initiate Fee Payment",
    module: "Fees & Finance",
    page: "Fee Payment Portal",
    resource: "/payments",
    outcome: `Initiated payment of ₹${amount} (Order ID: ${order.id})`,
    userId: user.id,
  });

  return {
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    error: null,
  };
}
