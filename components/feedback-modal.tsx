"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type Feedback = {
  type: "error" | "success";
  message: string;
};

export function FeedbackModal() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<Feedback>).detail;
      if (detail?.message) setFeedback(detail);
    };

    window.addEventListener("app-feedback", handleFeedback);
    return () => window.removeEventListener("app-feedback", handleFeedback);
  }, []);

  if (!feedback) return null;

  const isError = feedback.type === "error";

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-ink-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-feedback-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full text-lg font-bold ${
            isError ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isError ? "!" : "✓"}
        </div>
        <h2 id="app-feedback-title" className="mt-4 text-lg font-semibold text-ink-700">
          {isError ? "Validation error" : "Success"}
        </h2>
        <p className="mt-2 break-words text-sm text-slate/70">{feedback.message}</p>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={() => setFeedback(null)}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
