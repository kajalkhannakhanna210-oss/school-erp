"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-3xl text-ink-700">Check your email</h1>
        <p className="mt-2 text-sm text-slate/70">We sent a password reset link to {email}.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-ink-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-700">Reset password</h1>
      <p className="mt-1 text-sm text-slate/70">Enter the email your school office has on file.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <Link href="/login" className="mt-4 inline-block text-sm text-ink-600 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
