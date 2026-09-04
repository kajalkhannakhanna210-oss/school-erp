"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { OrganizationForm } from "./organization-form";

export function OrganizationEditModal({ organization, initialOpen = false }: { organization: { id: string; name: string; code: string; is_active: boolean }; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return <>
    <Button type="button" size="sm" variant="outline" className="min-h-9 px-2 sm:px-3" onClick={() => setOpen(true)}><span aria-hidden="true">✎</span><span className="hidden sm:inline"> Edit</span></Button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-organization-title"><div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"><div className="flex items-start justify-between gap-4 border-b border-ink-700/30 bg-ink-700 px-5 py-4 text-white sm:px-7 sm:py-5"><div><h2 id="edit-organization-title" className="font-display text-xl font-bold text-white sm:text-2xl">Edit organization</h2><p className="mt-1 text-xs text-white/65">Update organization details.</p></div><button type="button" aria-label="Close edit organization dialog" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-xl text-white shadow-sm transition hover:bg-white/20">×</button></div><div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-7 sm:pt-4"><OrganizationForm id={organization.id} initial={organization} embedded hideStatus onSuccess={() => setOpen(false)} /></div></div></div>}
  </>;
}
