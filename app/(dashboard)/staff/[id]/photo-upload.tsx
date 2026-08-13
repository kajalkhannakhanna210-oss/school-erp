"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createClient } from "@/lib/supabase/client";
import { sanitizeStorageFileName, validateImageUpload } from "@/lib/security/uploads";
import { setStaffPhoto } from "../actions";

export function PhotoUpload({ staffId }: { staffId: string }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  function handleUpload() {
    if (!file) return;
    startTransition(async () => {
      const validationError = validateImageUpload(file);
      if (validationError) {
        push(validationError, "error");
        return;
      }
      const supabase = createClient();
      const path = `${staffId}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("staff-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        push(uploadError.message, "error");
        return;
      }

      const { error } = await setStaffPhoto(staffId, path);
      if (error) {
        push(error, "error");
        return;
      }
      push("Photo updated");
      setFile(null);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Button onClick={handleUpload} disabled={!file || pending} variant="ghost">
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
