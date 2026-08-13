"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.phone[0];
    if (factorsError || !factor) { setError(factorsError?.message ?? "No SMS verification method is configured."); setLoading(false); return; }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id, channel: "sms" });
    setLoading(false);
    if (challengeError || !challenge) return setError(challengeError?.message ?? "Could not send the verification code.");
    setFactorId(factor.id); setChallengeId(challenge.id);
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault(); if (!factorId || !challengeId) return;
    setLoading(true); setError(null);
    const { error } = await createClient().auth.mfa.verify({ factorId, challengeId, code });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/dashboard"); router.refresh();
  }

  return <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-600">Second step</p><h1 className="mt-3 font-display text-3xl text-ink-700">Verify your login</h1><p className="mt-2 text-sm text-slate/70">Enter the SMS code to access the school portal.</p>{!challengeId ? <Button onClick={sendCode} className="mt-8 w-full" disabled={loading}>{loading ? "Sending…" : "Send SMS code"}</Button> : <form onSubmit={verifyCode} className="mt-8 space-y-4"><div><Label htmlFor="code">SMS verification code</Label><Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div><Button className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify and continue"}</Button></form>}{error && <p className="mt-4 text-sm text-danger">{error}</p>}</div>;
}
