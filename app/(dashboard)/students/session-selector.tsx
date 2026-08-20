"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function SessionSelector({ sessions, className = "" }: { sessions: { id: string; name: string; is_current?: boolean }[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selectedSession, setSelectedSession] = useState(
    searchParams?.get("session") ?? sessions.find((session) => session.is_current)?.id ?? sessions[0]?.id ?? "",
  );
  const value = selectedSession;

  function changeSession(session: string) {
    setSelectedSession(session);
    const params = new URLSearchParams(searchParams?.toString());
    if (session) params.set("session", session); else params.delete("session");
    params.delete("page");
    startTransition(() => {
    router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  }

  return <div className={`flex items-center gap-2 ${className}`}>
    <select aria-label="Academic session" value={value} disabled={pending} onChange={(e) => changeSession(e.target.value)} className="min-h-10 min-w-36 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 shadow-sm disabled:cursor-wait disabled:opacity-60">
      {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
    </select>
    {pending && <span className="text-xs font-medium text-slate/60">Loading…</span>}
  </div>;
}
