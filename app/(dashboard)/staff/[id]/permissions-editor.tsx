"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { setStaffPermissions } from "../actions";

type Permission = { key: string; label: string };

export function PermissionsEditor({
  staffId,
  allPermissions,
  assignedKeys,
}: {
  staffId: string;
  allPermissions: Permission[];
  assignedKeys: string[];
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(assignedKeys);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function handleSave() {
    startTransition(async () => {
      const { error } = await setStaffPermissions(staffId, selected);
      if (error) {
        push(error, "error");
        return;
      }
      push("Permissions updated");
    });
  }

  return (
    <div>
      <div className="space-y-2">
        {allPermissions.map((p) => (
          <label key={p.key} className="flex items-center gap-2 text-sm text-slate">
            <input type="checkbox" checked={selected.includes(p.key)} onChange={() => toggle(p.key)} />
            {p.label}
          </label>
        ))}
      </div>
      <Button onClick={handleSave} disabled={pending} className="mt-4">
        {pending ? "Saving…" : "Save permissions"}
      </Button>
    </div>
  );
}
