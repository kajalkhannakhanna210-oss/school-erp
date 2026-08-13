"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { TurnstileWidget } from "@/components/turnstile-widget";

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    void (async () => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, captchaToken }),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "We could not submit your message. Please try again in a moment.");
          return;
        }
        setSent(true);
      } catch {
        setError("We could not connect to the school server. Please try again in a moment.");
      } finally {
        setPending(false);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-success/20 bg-white p-8 text-center shadow-[0_18px_45px_-28px_rgba(34,47,87,0.6)] sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-3xl text-success" aria-hidden="true">✓</div>
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-success">Message received</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-ink-700">Thank you for contacting us</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate/70">Your enquiry has been sent successfully. Our school office will review it and get back to you shortly.</p>
        <p className="mt-3 text-xs text-slate/50">Please allow one working day for a response.</p>
        <Button type="button" variant="ghost" className="mt-7" onClick={() => { setSent(false); setError(null); setCaptchaToken(""); setForm({ name: "", email: "", phone: "", message: "", website: "" }); }}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_18px_45px_-28px_rgba(34,47,87,0.6)] sm:p-8">
      <div className="mb-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-gold-600">Send an enquiry</p><h2 className="mt-2 font-display text-2xl font-bold text-ink-700">We&apos;d love to hear from you</h2><p className="mt-2 text-sm leading-6 text-slate/65">Have a question about admissions or school life? Our team will get back to you shortly.</p></div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
      <Input id="phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          required
          rows={5}
          className="mt-1.5 min-h-32 w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm text-slate shadow-sm transition focus:border-ink-600 focus:outline-none focus:ring-4 focus:ring-ink-50"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <TurnstileWidget onTokenChange={setCaptchaToken} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending || !captchaToken} className="w-full sm:w-auto">
        {pending ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
