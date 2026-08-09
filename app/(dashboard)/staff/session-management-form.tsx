"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { transferStaffSession } from "./session-management-actions";

export function StaffSessionManagementForm({ sessions, sessionCounts }: { sessions: { id: string; name: string }[]; sessionCounts: Record<string, number> }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  return <Card className="max-w-3xl p-6 sm:p-8"><div className="border-b border-ink-100 pb-4"><h2 className="font-display text-xl text-ink-700">Transfer staff to another session</h2><p className="mt-1 text-sm text-slate/60">Previous session history is preserved. Existing target enrollments are updated.</p></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate">From session<select className="mt-2 block min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">Select session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="mt-2 block rounded-lg border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs text-slate/70">Staff enrolled <strong className="ml-1 text-base text-ink-700">{sessionCounts[from] ?? 0}</strong></span></label><label className="text-sm font-semibold text-slate">To session<select className="mt-2 block min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Select session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="mt-2 block rounded-lg border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs text-slate/70">Staff currently enrolled <strong className="ml-1 text-base text-ink-700">{sessionCounts[to] ?? 0}</strong></span></label></div><div className="mt-6 flex justify-end"><Button className="min-w-36" disabled={pending || !from || !to} onClick={() => startTransition(async () => { const result = await transferStaffSession(from, to); if (result.error) push(result.error, "error"); else push(`${result.count} staff member${result.count === 1 ? "" : "s"} transferred`); })}>{pending ? "Transferring…" : "Transfer staff"}</Button></div></Card>;
}
