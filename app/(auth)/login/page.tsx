"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const isAdminLogin = usePathname() === "/admin/login";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const supabase = createClient();
      const normalizedPhone = identifier.replace(/[\s()-]/g, "");
      const isPhone = normalizedPhone.startsWith("+") || /^\d{10,15}$/.test(normalizedPhone);
      const { data, error: signInError } = await Promise.race([
        supabase.auth.signInWithPassword(isPhone
          ? { phone: normalizedPhone.startsWith("+") ? normalizedPhone : `+91${normalizedPhone}`, password }
          : { email: identifier.trim().toLowerCase(), password }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Sign-in request timed out")), 12000)),
      ]);
      if (signInError || !data.user) { setError(signInError?.message ?? "Could not sign in."); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile) { await supabase.auth.signOut(); setError("No matching profile was found for this account."); return; }
      if (isAdminLogin && profile.role !== "super_admin") { await supabase.auth.signOut(); setError(`This account is registered as ${profile.role.replace("_", " ")}, not Super Admin.`); return; }
      const deviceStorageKey = "school_erp_device_id";
      const auditStorageKey = "school_erp_login_audit_id";
      const deviceId = window.localStorage.getItem(deviceStorageKey) ?? crypto.randomUUID();
      window.localStorage.setItem(deviceStorageKey, deviceId);
      const { data: audit } = await supabase.from("login_audit").insert({ user_id: data.user.id, login_identifier: identifier.trim().toLowerCase(), device_id: deviceId }).select("id").single();
      if (audit?.id) window.localStorage.setItem(auditStorageKey, audit.id);
      // Force a fresh request so the server layout reads the session cookie
      // written by Supabase before deciding whether to redirect.
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error && err.message === "Sign-in request timed out" ? "Sign-in timed out. Check your internet connection and try again." : "We couldn't reach the sign-in service. Check your internet connection and try again.");
    } finally { setLoading(false); }
  }
  return <div>
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-600">{isAdminLogin ? "Admin access" : "Secure access"}</p>
    <h1 className="mt-3 font-display text-3xl text-ink-700">{isAdminLogin ? "Admin sign in" : "Sign in"}</h1>
    <p className="mt-1 text-sm text-slate/70">{isAdminLogin ? "Use your Super Admin credentials to access the school administration panel." : "Use the credentials issued by your school office."}</p>
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div><Label htmlFor="identifier">Email or mobile number</Label><Input id="identifier" name="identifier" autoComplete="username" required placeholder="name@school.edu.in or +91 99999 99999" value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></div>
      <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
    <Link href="/forgot-password" className="mt-4 inline-block text-sm text-ink-600 hover:underline">Forgot your password?</Link>
  </div>;
}
