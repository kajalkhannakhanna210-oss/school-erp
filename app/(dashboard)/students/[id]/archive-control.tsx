"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { archiveStudent, restoreStudent } from "../actions";

export function ArchiveControl({ studentId, isActive, open: openProp, onClose, hideTrigger = false }: { studentId: string; isActive: boolean; open?: boolean; onClose?: () => void; hideTrigger?: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(openProp ?? false);
  const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [remark, setRemark] = useState("");

  // Sync controlled prop if provided
  useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  function handleConfirm() {
    if (!archiveDate) {
      push("Please select an archive date", "error");
      return;
    }
    if (!remark.trim()) {
      push("Please enter a remark", "error");
      return;
    }

    startTransition(async () => {
      const { error } = isActive
        ? await archiveStudent(studentId, archiveDate, remark.trim())
        : await restoreStudent(studentId);

      // close modal (controlled or uncontrolled)
      if (onClose) onClose(); else setOpen(false);

      if (error) {
        push(error, "error");
        return;
      }
      push(isActive ? "Student archived" : "Student restored", "success");
      setArchiveDate(new Date().toISOString().split("T")[0]);
      setRemark("");
    });
  }

  // If controlled and hideTrigger is true, don't render the trigger button when closed
  if (!open) {
    if (hideTrigger) return null;
    return (
      <Button variant={isActive ? "danger" : "ghost"} onClick={() => setOpen(true)} disabled={pending}>
        {isActive ? "Archive" : "Restore"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-sm whitespace-normal overflow-hidden rounded-lg bg-white shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-6">
          <h2 className="font-display text-lg text-ink-700">{isActive ? "Archive student?" : "Restore student?"}</h2>
          <p className="mt-2 whitespace-normal break-words text-sm leading-6 text-slate/70">
            {isActive
              ? "Archived students are hidden from the active roster but their fee and attendance history is kept."
              : "This student will reappear in the active roster."}
          </p>

          {isActive ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="archive-date">Date of Archiving *</Label>
                <Input
                  id="archive-date"
                  type="date"
                  value={archiveDate}
                  onChange={(e) => setArchiveDate(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">Remark / Reason for Archiving *</Label>
                <Textarea
                  id="remark"
                  placeholder="Enter the reason for archiving this student..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  disabled={pending}
                  required
                  rows={4}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" className="!text-ink-700" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={isActive ? "danger" : "primary"}
              className="!text-white"
              onClick={handleConfirm}
              disabled={pending || (isActive && (!archiveDate || !remark.trim()))}
            >
              {pending && <svg className="mr-2 inline-block h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
              {pending ? "Processing..." : isActive ? "Archive" : "Restore"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
