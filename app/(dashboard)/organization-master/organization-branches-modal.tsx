"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";

type School = { id: string; code: string; name: string; slug?: string | null; is_active: boolean };

export function OrganizationBranchesModal({ organizationName, schools, showLabel = false }: { organizationName: string; schools: School[]; showLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="font-bold text-ink-700 underline decoration-ink-200 underline-offset-2 hover:text-gold-700" aria-label={`View branches for ${organizationName}`}>{schools.length} {showLabel ? `branch${schools.length === 1 ? "" : "es"}` : ""}</button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-ink-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="organization-branches-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-gold-700">Branches</p><h2 id="organization-branches-title" className="mt-1 font-display text-xl font-semibold text-ink-700">{organizationName}</h2></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-xl text-slate/60 hover:bg-ink-50" aria-label="Close branches dialog">×</button></div>
        <div className="mt-4 space-y-2">{schools.length ? schools.map((school) => <div key={school.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-slate-50/60 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-700">{school.name}</p><p className="truncate font-mono text-xs text-slate/60">{school.code}{school.slug ? ` · /${school.slug}` : ""}</p></div><Badge variant={school.is_active ? "default" : "destructive"}>{school.is_active ? "Active" : "Inactive"}</Badge></div>) : <p className="rounded-xl border border-dashed border-ink-100 px-4 py-8 text-center text-sm text-slate/60">No branches found.</p>}</div>
        <div className="mt-5 flex justify-end"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button></div>
      </div>
    </div>}
  </>;
}
