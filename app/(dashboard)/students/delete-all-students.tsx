"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { deleteAllStudentRecords } from "./actions";

export function DeleteAllStudents({ disabled = false }: { disabled?: boolean }) {
  const { push } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleDelete() {
    setOpen(false);
    startTransition(async () => {
      const result = await deleteAllStudentRecords();
      if (result.error) push(result.error, "error");
      else {
        push(`${result.count} student record${result.count === 1 ? "" : "s"} removed`);
        router.refresh();
      }
    });
  }

  return <>
    <Button type="button" variant="ghost" disabled={pending || disabled} title={disabled ? "No student records available to delete" : "Delete all student records"} onClick={() => setOpen(true)} className="!border !border-red-200 !bg-white !text-red-700 hover:!bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Removing…" : "Delete all students"}</Button>
    <ConfirmDialog
      open={open}
      title="Delete all student records?"
      description="This permanently removes all student records. Profiles, classes, sections, and other master data will not be deleted. This action cannot be undone."
      onConfirm={handleDelete}
      onCancel={() => setOpen(false)}
    />
  </>;
}
