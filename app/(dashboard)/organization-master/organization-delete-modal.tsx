"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { deleteOrganization } from "./actions";

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={pending}>{pending ? "Deleting…" : "Confirm delete"}</Button>;
}

export function OrganizationDeleteModal({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(deleteOrganization.bind(null, id), { error: null as string | null, message: undefined as string | undefined });

  useEffect(() => {
    if (state.message) window.location.href = "/organization-master";
  }, [state.message]);

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="min-h-9 rounded-lg border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50" onClick={() => setOpen(true)}>Delete</Button>
      {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-ink-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby={`delete-${id}-title`}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <h2 id={`delete-${id}-title`} className="font-display text-lg font-semibold text-ink-700">Delete organization?</h2>
          <p className="mt-1 text-sm text-slate/65">This will permanently delete <strong>{name}</strong>. Please provide a reason.</p>
          <form action={formAction} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate/70" htmlFor={`delete-reason-${id}`}>Reason <span className="text-rose-500">*</span></label>
            <textarea id={`delete-reason-${id}`} name="reason" required minLength={3} rows={3} className="w-full resize-none rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 outline-none focus:border-rose-300" placeholder="Why is this organization being deleted?" />
            {state.error && <p className="text-xs font-medium text-rose-600">{state.error}</p>}
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><ConfirmDeleteButton /></div>
          </form>
        </div>
      </div>}
    </>
  );
}
