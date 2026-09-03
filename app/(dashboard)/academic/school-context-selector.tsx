"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toaster";
import type { MasterSchool } from "@/lib/security/master-data-context";

export function SchoolContextSelector({ schools, organizationId, schoolId, loginScope, compact = false }: { schools: MasterSchool[]; organizationId: string | null; schoolId: string | null; loginScope: "school" | "organization" | "super_admin" | null; compact?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(schoolId ?? "");

  function change(nextSchoolId: string) {
    setValue(nextSchoolId);
    const school = schools.find((item) => item.id === nextSchoolId);
    if (!school) return;
    startTransition(async () => {
      const response = await fetch("/api/auth/select-context", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: school.organization_id, schoolId: school.id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { push(body?.error ?? "Could not change school context.", "error"); setValue(schoolId ?? ""); return; }
      push(`School context changed to ${school.name}`);
      router.refresh();
    });
  }

  if (loginScope === "school") return null;
  return <div className={`${compact ? "mb-0 border-0 bg-transparent p-0 shadow-none" : "mb-5 border border-ink-100 bg-white px-4 py-3 shadow-sm"} flex flex-wrap items-center justify-between gap-3 rounded-xl`}><div className={compact ? "hidden sm:block" : undefined}><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate/55">Active school</p><p className="mt-0.5 text-sm text-slate/70">Master Data is saved inside the selected school.</p></div><select aria-label="Select school" value={value} onChange={(event) => change(event.target.value)} disabled={pending || schools.length === 0} className="min-h-10 min-w-56 rounded-lg border border-ink-100 bg-white px-3 text-sm font-semibold text-ink-700 outline-none focus:border-ink-700"><option value="">Select school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.code} — {school.name}</option>)}</select></div>;
}
