import Razorpay from "razorpay";

// Server-only. RAZORPAY_KEY_SECRET must never be exposed to the browser —
// only NEXT_PUBLIC_RAZORPAY_KEY_ID (not secret) goes client-side, for
// Checkout.js.
export function createRazorpayClient() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}
