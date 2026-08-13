"use client";

import { useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type AdmissionFormState = {
  student_name: string;
  date_of_birth: string;
  applying_for: string;
  parent_name: string;
  parent_email: string;
  address: string;
  website: string;
};

const emptyForm: AdmissionFormState = {
  student_name: "",
  date_of_birth: "",
  applying_for: "",
  parent_name: "",
  parent_email: "",
  address: "",
  website: "",
};

export function AdmissionForm() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [form, setForm] = useState<AdmissionFormState>(emptyForm);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    const { error: otpError } = await createClient().auth.signInWithOtp({ phone: `+91${phone}` });
    setBusy(false);
    if (otpError) setError(otpError.message);
    else setStep(2);
  }

  async function verifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = new FormData(e.currentTarget).get("code") as string;
    const { error: otpError } = await createClient().auth.verifyOtp({ phone: `+91${phone}`, token: code, type: "sms" });
    setBusy(false);
    if (otpError) setError(otpError.message);
    else setStep(3);
  }

  function submitApplication(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    void (async () => {
      try {
        const response = await fetch("/api/admissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, phone, captchaToken }),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "We could not submit your application. Please try again in a moment.");
          return;
        }
        setStep(4);
      } catch {
        setError("We could not connect to the school server. Please try again in a moment.");
      } finally {
        setPending(false);
      }
    });
  }

  if (step === 4) {
    return (
      <div className="mt-8 rounded-xl bg-success/10 p-8 text-success">
        Application submitted. Our admissions office will contact you shortly.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate/60">Step {step} of 3</p>

      {step === 1 && (
        <div className="mt-4">
          <Label htmlFor="admission-phone">Mobile number</Label>
          <Input
            id="admission-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
          />
          <Button type="button" className="mt-5" disabled={busy || phone.length !== 10} onClick={sendOtp}>
            {busy ? "Sending..." : "Send OTP"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={verifyOtp} className="mt-4">
          <Label htmlFor="admission-code">OTP code</Label>
          <Input id="admission-code" name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} />
          <Button className="mt-5" disabled={busy}>
            {busy ? "Verifying..." : "Verify and continue"}
          </Button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitApplication} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="student_name">Student name</Label>
            <Input
              id="student_name"
              required
              value={form.student_name}
              onChange={(e) => setForm({ ...form, student_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input
              id="date_of_birth"
              required
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="applying_for">Applying for class</Label>
            <Input
              id="applying_for"
              required
              value={form.applying_for}
              onChange={(e) => setForm({ ...form, applying_for: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="parent_name">Parent/guardian name</Label>
            <Input
              id="parent_name"
              required
              value={form.parent_name}
              onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="parent_email">Parent email</Label>
            <Input
              id="parent_email"
              required
              type="email"
              value={form.parent_email}
              onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
            />
          </div>
          <div className="hidden" aria-hidden="true">
            <Label htmlFor="admission-website">Website</Label>
            <Input
              id="admission-website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              required
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-ink-100 bg-white p-3 text-sm text-slate shadow-sm transition focus:border-ink-600 focus:outline-none focus:ring-4 focus:ring-ink-50"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TurnstileWidget onTokenChange={setCaptchaToken} />
          </div>
          <Button disabled={pending || !captchaToken}>{pending ? "Saving..." : "Submit application"}</Button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
