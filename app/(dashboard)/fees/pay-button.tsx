"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createPaymentOrder } from "./payment-actions";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PayButton({
  feeHeadId,
  outstanding,
  studentName,
  studentEmail,
}: {
  feeHeadId: string;
  outstanding: number;
  studentName: string;
  studentEmail: string;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(outstanding));
  const [confirming, setConfirming] = useState(false);

  function handlePay() {
    startTransition(async () => {
      const result = await createPaymentOrder(feeHeadId, amount);
      if (result.error || !result.order_id || !result.amount) {
        push(result.error ?? "Could not start the payment", "error");
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        push("Could not load the payment window — check your connection and try again", "error");
        return;
      }

      const rzp = new window.Razorpay({
        key: result.key,
        order_id: result.order_id,
        amount: Math.round(Number(result.amount)),
        currency: result.currency || "INR",
        name: "School Fee Payment",
        prefill: { name: studentName, email: studentEmail },
        handler: () => {
          // This fires when Razorpay's checkout flow completes on the
          // client — it is NOT proof the payment succeeded. The webhook is
          // the only source of truth for that; this just tells the student
          // what to expect next while it confirms.
          setConfirming(true);
        },
      });
      rzp.open();
    });
  }

  if (confirming) {
    return (
      <p className="text-sm text-slate/60">
        Payment submitted — confirming with the bank. Refresh this page in a moment to see it reflected.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="1"
        max={outstanding}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-0 w-24"
      />
      <Button onClick={handlePay} disabled={pending}>
        {pending ? "Starting…" : "Pay"}
      </Button>
    </div>
  );
}
