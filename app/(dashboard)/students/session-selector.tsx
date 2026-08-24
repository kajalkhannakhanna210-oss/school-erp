"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setSelectedSessionCookie } from "../session-actions";

export function SessionSelector({
  sessions,
  initialSessionId = "",
  className = "",
}: {
  sessions: { id: string; name: string; is_current?: boolean }[];
  initialSessionId?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const defaultSessionId =
    initialSessionId ||
    sessions.find((s) => s.is_current)?.id ||
    sessions[0]?.id ||
    "";

  const [selectedSession, setSelectedSession] = useState(defaultSessionId);

  useEffect(() => {
    if (initialSessionId) {
      setSelectedSession(initialSessionId);
    }
  }, [initialSessionId]);

  function changeSession(session: string) {
    setSelectedSession(session);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_session_id", session);
      try {
        sessionStorage.clear();
      } catch {}
    }

    const currentSearch = typeof window !== "undefined" ? window.location.search : (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const params = new URLSearchParams(currentSearch);
    params.set("session", session);
    params.delete("page");
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    const targetUrl = `${currentPath}?${params.toString()}`;

    startTransition(async () => {
      await setSelectedSessionCookie(session);
      router.push(targetUrl);
      router.refresh();
    });
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        aria-label="Academic session"
        value={selectedSession}
        disabled={pending}
        onChange={(e) => changeSession(e.target.value)}
        className="min-h-10 min-w-36 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 shadow-sm disabled:cursor-wait disabled:opacity-60"
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs font-medium text-slate/60">Loading…</span>}
    </div>
  );
}
