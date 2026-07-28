"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { setStudentActive } from "../actions";

export function ArchiveControl({ studentId, isActive }: { studentId: string; isActive: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const { error } = await setStudentActive(studentId, !isActive);
      setOpen(false);
      if (error) {
        push(error, "error");
        return;
      }
      push(isActive ? "Student archived" : "Student restored");
    });
  }

  return (
    <>
      <Button variant={isActive ? "danger" : "ghost"} onClick={() => setOpen(true)} disabled={pending}>
        {isActive ? "Archive" : "Restore"}
      </Button>
      <ConfirmDialog
        open={open}
        title={isActive ? "Archive student?" : "Restore student?"}
        description={
          isActive
            ? "Archived students are hidden from the active roster but their fee and attendance history is kept."
            : "This student will reappear in the active roster."
        }
        confirmLabel={isActive ? "Archive" : "Restore"}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
