"use client";

import { Button } from "./ui";

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  isLoading = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isLoading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-sm whitespace-normal overflow-hidden rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h2 className="font-display text-lg text-ink-700">{title}</h2>
        <p className="mt-2 whitespace-normal break-words text-sm leading-6 text-slate/70">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" className="!text-ink-700" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" className="!text-white" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <svg className="mr-2 inline-block h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
