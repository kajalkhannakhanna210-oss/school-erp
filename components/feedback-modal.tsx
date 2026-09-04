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
      className="fixed inset-0 z-[200] grid place-items-center bg-[#17213f]/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-feedback-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_28px_80px_rgba(23,33,63,0.35)]">
        <div className={`h-1.5 w-full ${isError ? "bg-gradient-to-r from-rose-500 to-pink-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />
        <div className="p-6 text-center sm:p-7">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-black ${
            isError ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isError ? "!" : "✓"}
        </div>
        <h2 id="app-feedback-title" className="mt-5 font-display text-2xl font-bold tracking-tight text-ink-700">
          {isError ? "Validation error" : "Success"}
        </h2>
        <p className="mt-2 break-words text-center text-base font-semibold leading-6 text-slate/70">{feedback.message}</p>
        <div className="mt-6 flex justify-end">
          <Button type="button" className="h-11 min-w-24 rounded-xl px-8" onClick={() => { setFeedback(null); window.dispatchEvent(new Event("app-feedback-closed")); }}>
            OK
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
