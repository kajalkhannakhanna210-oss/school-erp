"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { Impersonation } from "@/lib/security/impersonation";

export function ImpersonationBanner({ session }: { session: Impersonation }) {
  const router = useRouter();
  async function end() { await fetch("/api/admin/login-as", { method: "DELETE" }); router.push("/login-as"); router.refresh(); }
  return <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm text-ink-900 shadow-sm lg:px-8"><div><span className="mr-2 font-black uppercase tracking-wider">Admin access</span><span>You are logged in as: <strong>{session.targetName}</strong> · {session.targetRole === "staff" ? "Faculty" : "Student"} · {session.schoolName}</span></div><Button type="button" size="sm" variant="outline" onClick={end} className="border-ink-900/20 bg-white text-ink-900">Return to Admin</Button></div>;
}
