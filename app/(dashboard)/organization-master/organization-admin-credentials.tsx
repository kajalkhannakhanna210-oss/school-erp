"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { resetOrganizationAdminPassword } from "./actions";

export function OrganizationAdminCredentials({ organizationId, identifier }: { organizationId: string; identifier: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reset = () => startTransition(async () => { setError(null); setPassword(null); const result = await resetOrganizationAdminPassword(organizationId); if (result.error) setError(result.error); else setPassword(result.temporaryPassword ?? null); });
  return <CardShell><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate/60">Default admin login</p><p className="mt-1 break-all text-sm font-semibold text-ink-700">{identifier}</p></div><Button type="button" size="sm" variant="outline" onClick={reset} disabled={pending}>{pending ? "Resetting…" : "Reset password"}</Button></div>{password && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">New temporary password</p><p className="mt-1 break-all font-mono text-sm font-semibold text-ink-900">{password}</p><p className="mt-1 text-xs text-amber-800">Save it now. It will not be shown again.</p></div>}{error && <p className="mt-2 text-xs text-danger">{error}</p>}</CardShell>;
}

function CardShell({ children }: { children: React.ReactNode }) { return <div className="mb-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">{children}</div>; }
