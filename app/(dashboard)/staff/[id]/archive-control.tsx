"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { setStaffActive } from "../actions";

export function ArchiveControl({ staffId, isActive }: { staffId: string; isActive: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const { error } = await setStaffActive(staffId, !isActive);
      setOpen(false);
      if (error) {
        push(error, "error");
        return;
      }
      push(isActive ? "Staff member archived" : "Staff member restored");
    });
  }

  return (
    <>
      <Button variant={isActive ? "danger" : "ghost"} onClick={() => setOpen(true)} disabled={pending}>
        {isActive ? "Archive" : "Restore"}
      </Button>
      <ConfirmDialog
        open={open}
        title={isActive ? "Archive staff member?" : "Restore staff member?"}
        description={
          isActive
            ? "Archiving removes them from class-teacher eligibility and the active roster. Their record is kept."
            : "This staff member will reappear in the active roster and become eligible for class-teacher assignment again."
        }
        confirmLabel={isActive ? "Archive" : "Restore"}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
