"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";

const roleIds = ["student", "parent", "staff"] as const;
type RoleId = (typeof roleIds)[number];

function isRoleId(value: unknown): value is RoleId {
  return roleIds.includes(value as RoleId);
}

export default function LoginPage() {
  const pathname = usePathname();
  const isAdminLogin = pathname === "/admin/login";

  const [activeTab, setActiveTab] = useState<RoleId>("student");
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

  useEffect(() => {
    if (isAdminLogin) return;

    let cancelled = false;
    async function loadRememberedDevice() {
      const response = await fetch("/api/auth/remember-device", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const result = (await response.json().catch(() => null)) as {
        remembered?: boolean;
        identifier?: unknown;
        role?: unknown;
      } | null;

      if (!cancelled && result?.remembered && typeof result.identifier === "string") {
        setIdentifier(result.identifier);
        if (isRoleId(result.role)) setActiveTab(result.role);
        setRememberMe(true);
      }
    }

    void loadRememberedDevice();
    return () => {
      cancelled = true;
    };
  }, [isAdminLogin]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await Promise.race([
        fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier,
            password,
            role: activeTab,
            adminLogin: isAdminLogin,
            remember: rememberMe,
          }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Sign-in request timed out")), 12000)),
      ]);

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Invalid credentials. Check your details and try again.");
        return;
      }

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
    <div className="px-1 py-0 sm:px-0 sm:py-2 lg:py-4">
      {/* Role Selection Segmented Control Tabs */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-slate-100 p-1 shadow-inner shadow-slate-200/70">
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
                className={`h-9 rounded-xl text-center text-sm font-bold transition-all duration-200 sm:h-11 ${
                  isActive
                    ? "text-white bg-slate-950 shadow-md shadow-slate-950/12"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/70"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Info */}
      <div className="mb-4 sm:mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {isAdminLogin ? "Admin Login" : "Login"}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {isAdminLogin
            ? "Enter Super Admin credentials to manage system settings & permissions."
            : `Enter your credentials issued by the school administrative office.`}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-3 sm:space-y-5">
        {/* Email or Phone Input */}
        <div>
          <Label htmlFor="identifier" className="mb-1.5 block text-xs font-bold text-slate-500 sm:mb-2">
            Email or Mobile Number
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="mt-0 h-12 min-h-12 rounded-2xl border-slate-200 bg-slate-50/90 pl-11 text-base text-slate-950 shadow-sm shadow-slate-200/50 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10 sm:text-sm"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between sm:mb-2">
            <Label htmlFor="password" className="text-xs font-bold text-slate-500">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="mt-0 h-12 min-h-12 rounded-2xl border-slate-200 bg-slate-50/90 pl-11 pr-11 text-base text-slate-950 shadow-sm shadow-slate-200/50 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember me option */}
        <div className="flex items-center justify-between pt-0.5 sm:pt-1">
          <label className="flex cursor-pointer select-none items-center gap-2.5">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900/20"
            />
            <span className="text-sm font-semibold text-slate-600">Remember this device</span>
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
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800 disabled:opacity-70 sm:h-11 sm:text-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Login</span>
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
