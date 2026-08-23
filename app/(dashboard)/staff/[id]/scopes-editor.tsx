"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { setStaffModuleScopes } from "./actions";

export function ScopesEditor({ staffId, allClasses, assignedScopes }: { staffId: string; allClasses: { id: string; name: string }[]; assignedScopes: { scope_type: string; resource_id: string | null }[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const initialClassIds = assignedScopes?.filter((s) => s.scope_type === "CLASS").map((s) => s.resource_id ?? "") ?? [];
  const hasAll = assignedScopes?.some((s) => s.scope_type === "ALL");
  const [all, setAll] = useState<boolean>(hasAll);
  const [selected, setSelected] = useState<string[]>(initialClassIds as string[]);

  function toggleClass(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    startTransition(async () => {
      const { error } = await setStaffModuleScopes(staffId, all, selected);
      if (error) {
        push(error, "error");
        return;
      }
      push("Admission scopes updated");
    });
  }

  return (
    <div>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          <span className="text-sm text-slate">All classes (can manage enquiries for all classes)</span>
        </label>
        {!all && (
          <div className="grid gap-2 sm:grid-cols-2">
            {allClasses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-slate">
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleClass(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save scopes"}</Button>
      </div>
    </div>
  );
}
