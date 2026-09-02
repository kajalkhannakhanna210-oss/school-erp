"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { activateOrganization, deactivateOrganization } from "./actions";

function ConfirmDeactivateButton({ activate }: { activate: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className={activate ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} disabled={pending}>{pending ? `${activate ? "Activating" : "Deactivating"}…` : `Confirm ${activate ? "activate" : "deactivate"}`}</Button>;
}

export function OrganizationStatusModal({ id, name, compact = false, activate = false }: { id: string; name: string; compact?: boolean; activate?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { push } = useToast();
  const [state, formAction] = useFormState((activate ? activateOrganization : deactivateOrganization).bind(null, id), { error: null as string | null, message: undefined as string | undefined });

  useEffect(() => {
    if (state.message) { setOpen(false); push(state.message, "success"); router.refresh(); }
  }, [router, state.message]);

  return (
    <>
      <Button type="button" size="sm" variant="outline" className={compact ? `min-h-9 w-9 rounded-lg px-0 text-sm ${activate ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"}` : `min-h-9 rounded-lg px-3 text-xs ${activate ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"}`} aria-label={`${activate ? "Activate" : "Deactivate"} organization`} title={`${activate ? "Activate" : "Deactivate"} organization`} onClick={() => setOpen(true)}>{compact ? (activate ? "✓" : "⊘") : (activate ? "✓ Activate" : "⊘ Deactivate")}</Button>
      {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-ink-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby={`deactivate-${id}-title`}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <h2 id={`deactivate-${id}-title`} className="font-display text-lg font-semibold text-ink-700">{activate ? "Activate" : "Deactivate"} organization?</h2>
          <p className="mt-1 text-sm text-slate/65">You are changing the status of <strong>{name}</strong>. Please provide a reason.</p>
          <form action={formAction} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate/70" htmlFor={`deactivate-reason-${id}`}>Reason <span className="text-rose-500">*</span></label>
            <textarea id={`deactivate-reason-${id}`} name="reason" required minLength={3} rows={3} className="w-full resize-none rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-rose-300" placeholder={`Why is this organization being ${activate ? "activated" : "deactivated"}?`} />
            {state.error && <p className="text-xs font-medium text-rose-600">{state.error}</p>}
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><ConfirmDeactivateButton activate={activate} /></div>
          </form>
        </div>
      </div>}
    </>
  );
}
