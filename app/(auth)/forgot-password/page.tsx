"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { genericResetMessage } from "@/lib/security/auth-inputs";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json().catch(() => ({}))) as { message?: string };

    setLoading(false);
    if (!response.ok) {
      setError(result.message ?? "Too many reset requests. Please try again later.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:rounded-[2rem] sm:p-7 lg:shadow-2xl">
        <div className="mb-6">
          <h1 className="font-display text-[1.75rem] font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
            Check Your Email
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {genericResetMessage}
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white shadow-xl shadow-slate-900/25 transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:h-14 sm:rounded-2xl"
          >
            <span>Back to Sign In</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Didn't receive the email? Check your spam folder or{" "}
          <button
            onClick={() => setSent(false)}
            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:rounded-[2rem] sm:p-7 lg:shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[1.75rem] font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
          Reset Password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <Label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Email Address
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="your.email@school.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/90 pl-10 text-sm text-slate-950 shadow-sm shadow-slate-900/5 transition focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10 sm:h-[54px] sm:rounded-2xl sm:pl-11"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white shadow-xl shadow-slate-900/25 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:opacity-70 sm:mt-3 sm:h-14 sm:rounded-2xl"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </Button>
      </form>

      {/* Back to Sign In */}
      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/login"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition"
        >
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}
