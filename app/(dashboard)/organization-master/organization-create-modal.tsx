"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { OrganizationForm } from "./organization-form";

export function OrganizationCreateModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className="h-10 w-full whitespace-nowrap sm:w-auto" onClick={() => setOpen(true)}>
        <span className="sm:hidden"><span aria-hidden="true">+</span> Add</span><span className="hidden sm:inline"><span aria-hidden="true">+</span> Add Organization</span>
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="add-organization-title">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-ink-700/30 bg-ink-700 px-5 py-4 text-white sm:px-7 sm:py-5">
              <div><h2 id="add-organization-title" className="font-display text-xl font-bold text-white sm:text-2xl">Add organization</h2><p className="mt-1 text-xs text-white/65">Create a new organization account.</p></div>
              <button type="button" aria-label="Close add organization dialog" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-xl text-white shadow-sm transition hover:bg-white/20">×</button>
            </div>
            <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-7 sm:pt-4"><OrganizationForm embedded /></div>
          </div>
        </div>
      )}
    </>
  );
}
