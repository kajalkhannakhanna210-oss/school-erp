"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const pathname = usePathname();
  const isAdminLogin = pathname === "/admin/login";

  const [activeTab, setActiveTab] = useState<"student" | "parent" | "staff">("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleTabs = [
    { id: "student", label: "Student" },
    { id: "parent", label: "Parent" },
    { id: "staff", label: "Staff" },
  ] as const;

  const rolePlaceholders: Record<string, string> = {
    student: "rollno@school.edu.in or student ID",
    parent: "parent@school.edu.in or registered mobile",
    staff: "staff@school.edu.in or staff ID",
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const normalizedPhone = identifier.replace(/[\s()-]/g, "");
      const isPhone = normalizedPhone.startsWith("+") || /^\d{10,15}$/.test(normalizedPhone);
      const { data, error: signInError } = await Promise.race([
        supabase.auth.signInWithPassword(
          isPhone
            ? { phone: normalizedPhone.startsWith("+") ? normalizedPhone : `+91${normalizedPhone}`, password }
            : { email: identifier.trim().toLowerCase(), password }
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Sign-in request timed out")), 12000)),
      ]);
      if (signInError || !data.user) {
        setError(signInError?.message ?? "Could not sign in with provided credentials.");
        return;
      }
      const [{ data: profile, error: profileError }, { data: userRoles }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle(),
        supabase.from("profile_roles").select("role").eq("profile_id", data.user.id),
      ]);

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("No matching profile was found for this account.");
        return;
      }
      if (isAdminLogin) {
        if (profile.role !== "super_admin") {
          await supabase.auth.signOut();
          setError(`This account is registered as ${profile.role.replace("_", " ")}, not Super Admin.`);
          return;
        }
      } else {
        const assignedRoles = new Set<string>([
          profile.role,
          ...(userRoles ?? []).map((r: { role: string }) => r.role),
        ]);

        if (profile.role === "super_admin" && activeTab === "staff") {
          assignedRoles.add("staff");
        }

        if (!assignedRoles.has(activeTab)) {
          await supabase.auth.signOut();
          const readableRole = profile.role.replace("_", " ");
          setError(
            `This account is registered as ${readableRole}, not ${activeTab}. Please select the ${readableRole} tab to sign in.`
          );
          return;
        }

        if (profile.role !== activeTab && assignedRoles.has(activeTab)) {
          try {
            await supabase.rpc("set_my_active_role", { next_role: activeTab });
          } catch {
            // Ignore if RPC fails
          }
        }
      }
      const deviceStorageKey = "school_erp_device_id";
      const auditStorageKey = "school_erp_login_audit_id";
      const deviceId = window.localStorage.getItem(deviceStorageKey) ?? crypto.randomUUID();
      window.localStorage.setItem(deviceStorageKey, deviceId);
      const { data: audit } = await supabase
        .from("login_audit")
        .insert({ user_id: data.user.id, login_identifier: identifier.trim().toLowerCase(), device_id: deviceId })
        .select("id")
        .single();
      if (audit?.id) window.localStorage.setItem(auditStorageKey, audit.id);

      // Redirect to dashboard
      window.location.assign("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Sign-in request timed out"
          ? "Sign-in timed out. Check your internet connection and try again."
          : "We couldn't reach the sign-in service. Check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-1 sm:py-4">
      {/* Role Selection Segmented Control Tabs */}
      <div className="mb-3 sm:mb-6">
        <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
          {roleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                }}
                className={`py-1.5 sm:py-2.5 text-xs font-bold rounded-lg transition-all duration-200 text-center ${
                  isActive
                    ? "text-white bg-slate-900 shadow-md border border-slate-900"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Info */}
      <div className="mb-3 sm:mb-6">
        <h1 className="font-display text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {isAdminLogin ? "Admin Sign In" : "Sign In to Portal"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
          {isAdminLogin
            ? "Enter Super Admin credentials to manage system settings & permissions."
            : `Enter your credentials issued by the school administrative office.`}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-3 sm:space-y-5">
        {/* Email or Phone Input */}
        <div>
          <Label htmlFor="identifier" className="text-slate-700 font-semibold text-xs mb-1 block sm:mb-1.5">
            Email or Mobile Number
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              required
              placeholder={rolePlaceholders[activeTab] || "name@school.edu.in"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="pl-10 h-10 sm:h-11 border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-900/10 text-slate-900 text-sm rounded-xl bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1 sm:mb-1.5">
            <Label htmlFor="password" className="text-slate-700 font-semibold text-xs">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-10 sm:h-11 border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-900/10 text-slate-900 text-sm rounded-xl bg-white shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember me option */}
        <div className="flex items-center justify-between pt-0.5 sm:pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
            />
            <span className="text-xs font-medium text-slate-600">Remember this device</span>
          </label>
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
          className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-1.5 sm:mt-2 text-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
