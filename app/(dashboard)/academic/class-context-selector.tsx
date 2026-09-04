"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toaster";
import { setSelectedClassCookie } from "../class-actions";

type ClassOption = { id: string; name: string; sort_order?: number };

export function ClassContextSelector({ classes, initialClassId, loginScope, compact = false }: { classes: ClassOption[]; initialClassId?: string; loginScope: "school" | "organization" | "super_admin" | null; compact?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const validInitialClassId = classes.some((item) => item.id === initialClassId) ? initialClassId ?? "" : "";
  const [value, setValue] = useState(validInitialClassId);

  if (loginScope === "school") return null;

  function change(nextClassId: string) {
    setValue(nextClassId);
    if (!nextClassId) return;
    startTransition(async () => {
      const result = await setSelectedClassCookie(nextClassId);
      if (result.error) {
        push(result.error, "error");
        setValue(initialClassId ?? "");
        return;
      }
      push("Class selection changed");
      router.refresh();
    });
  }

  return <div className={`${compact ? "mb-0 border-0 bg-transparent p-0 shadow-none" : "border border-ink-100 bg-white px-3 py-2 shadow-sm"} flex items-center gap-2 rounded-xl`}>
    {!compact && <p className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-slate/55 sm:block">Active class</p>}
    <select aria-label="Select class" value={value} onChange={(event) => change(event.target.value)} disabled={pending || classes.length === 0} className="min-h-10 min-w-36 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-ink-700 disabled:opacity-60">
      <option value="">{classes.length ? "Select class" : "Select school first"}</option>
      {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </div>;
}
