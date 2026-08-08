"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { setStaffActive } from "./actions";

export function StaffStatusButton({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function confirmChange() {
    setOpen(false);
    startTransition(async () => {
      const result = await setStaffActive(id, !active);
      if (result.error) window.alert(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        {pending ? "Saving..." : active ? "Inactive" : "Active"}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-lg text-ink-700">{active ? "Deactivate" : "Activate"} staff member?</h2>
            <p className="mt-2 text-sm text-slate/70">{name} will be marked {active ? "inactive" : "active"}. Do you want to continue?</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" variant="danger" onClick={confirmChange}>{active ? "Mark inactive" : "Mark active"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
