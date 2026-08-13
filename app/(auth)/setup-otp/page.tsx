"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function SetupOtpPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "phone",
      phone: phone.replace(/\s/g, ""),
      friendlyName: "School portal SMS",
    });
    if (enrollError || !enrollment) {
      setError(enrollError?.message ?? "Could not set up SMS verification.");
      setLoading(false);
      return;
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollment.id,
      channel: "sms",
    });
    setLoading(false);
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Could not send the verification code.");
      return;
    }
    setFactorId(enrollment.id);
    setChallengeId(challenge.id);
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.mfa.verify({ factorId, challengeId, code });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-600">Security setup</p>
      <h1 className="mt-3 font-display text-3xl text-ink-700">Set up SMS verification</h1>
      <p className="mt-2 text-sm leading-6 text-slate/70">Confirm your mobile number to complete the second step of every school portal login.</p>
      {!challengeId ? (
        <form onSubmit={sendCode} className="mt-8 space-y-4">
          <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send SMS code"}</Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-4">
          <div><Label htmlFor="code">SMS verification code</Label><Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Verifying…" : "Complete setup"}</Button>
        </form>
      )}
    </div>
  );
}
