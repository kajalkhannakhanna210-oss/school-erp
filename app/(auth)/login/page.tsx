"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const isAdminLogin = usePathname() === "/admin/login";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const normalizedPhone = identifier.replace(/[\s()-]/g, "");
    const isPhone = normalizedPhone.startsWith("+") || /^\d{10,15}$/.test(normalizedPhone);
    const { data: signInData, error: passwordError } = await supabase.auth.signInWithPassword(
      isPhone
        ? { phone: normalizedPhone.startsWith("+") ? normalizedPhone : `+91${normalizedPhone}`, password }
        : { email: identifier, password }
    );

    if (passwordError) {
      setLoading(false);
      setError(
        passwordError.message.toLowerCase().includes("phone logins are disabled")
          ? "Phone login is disabled in Supabase. Use your email address or enable Authentication → Providers → Phone."
          : passwordError.message
      );
      return;
    }

    if (isAdminLogin) {
      const { data: profile, error: profileError } = signInData.user
        ? await supabase.from("profiles").select("role").eq("id", signInData.user.id).maybeSingle()
        : { data: null, error: null };

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("No matching profile was found for this account. Confirm that its profile uses the same user ID as the Auth user.");
        return;
      }

      if (profile.role !== "super_admin") {
        await supabase.auth.signOut();
        setLoading(false);
        setError(`This account is registered as ${profile.role.replace("_", " ")}, not Super Admin.`);
        return;
      }
    }

    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold-600">{isAdminLogin ? "Admin access" : "Secure access"}</p>
      <h1 className="mt-3 font-display text-3xl text-ink-700">{isAdminLogin ? "Admin sign in" : "Sign in"}</h1>
      <p className="mt-1 text-sm text-slate/70">
        {isAdminLogin ? "Use your Super Admin credentials to access the school administration panel." : "Use the credentials issued by your school office."}
      </p>
      <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
        <div><Label htmlFor="identifier">Email or mobile number</Label><Input id="identifier" autoComplete="username" required placeholder="name@school.edu.in or +91 99999 99999" value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Checking password…" : "Sign in"}</Button>
      </form>
      <Link href="/forgot-password" className="mt-4 inline-block text-sm text-ink-600 hover:underline">Forgot your password?</Link>
    </div>
  );
}
