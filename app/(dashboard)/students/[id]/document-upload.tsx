"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { createClient } from "@/lib/supabase/client";
import { sanitizeStorageFileName, validateDocumentUpload } from "@/lib/security/uploads";
import { addStudentDocument, removeStudentDocument } from "../actions";

export type DocumentRow = { id: string; file_name: string; signedUrl: string | null };

export function DocumentUpload({
  studentId,
  documents,
  canManage,
}: {
  studentId: string;
  documents: DocumentRow[];
  canManage: boolean;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [removeTarget, setRemoveTarget] = useState<DocumentRow | null>(null);

  function handleUpload() {
    if (!file) return;
    startTransition(async () => {
      const validationError = validateDocumentUpload(file);
      if (validationError) {
        push(validationError, "error");
        return;
      }
      const supabase = createClient();
      const safeFileName = sanitizeStorageFileName(file.name);
      const path = `${studentId}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(path, file);

      if (uploadError) {
        push(uploadError.message, "error");
        return;
      }

      const { error } = await addStudentDocument(studentId, path, safeFileName);
      if (error) {
        push(error, "error");
        return;
      }
      push("Document uploaded");
      setFile(null);
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      const { error } = await removeStudentDocument(removeTarget.id, studentId);
      setRemoveTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Document removed");
    });
  }

  return (
    <div>
      <ul className="space-y-2 text-sm">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between">
            {d.signedUrl ? (
              <a href={d.signedUrl} target="_blank" rel="noreferrer" className="text-ink-600 hover:underline">
                {d.file_name}
              </a>
            ) : (
              <span className="text-slate/50">{d.file_name}</span>
            )}
            {canManage && (
              <Button variant="ghost" onClick={() => setRemoveTarget(d)}>
                Remove
              </Button>
            )}
          </li>
        ))}
        {documents.length === 0 && <li className="text-slate/50">No documents uploaded.</li>}
      </ul>
      {canManage && (
        <div className="mt-4 flex items-center gap-3">
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <Button onClick={handleUpload} disabled={!file || pending} variant="ghost">
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove document?"
        description="This deletes the file from the student's record."
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
