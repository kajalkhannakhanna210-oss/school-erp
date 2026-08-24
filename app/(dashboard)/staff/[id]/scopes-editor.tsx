"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { setStaffActionScopes } from "../actions";

export type ActionKey = "view" | "create" | "edit" | "assign" | "followup" | "change_status" | "report" | "export";

export const ACTION_CONFIG: { key: ActionKey; label: string; description: string }[] = [
  { key: "create", label: "Create Scope", description: "Classes allowed when registering new enquiries" },
  { key: "view", label: "View Scope", description: "Classes allowed to be viewed in enquiry lists" },
  { key: "edit", label: "Edit Scope", description: "Classes allowed to be edited" },
  { key: "assign", label: "Assign Scope", description: "Classes user can assign to staff" },
  { key: "followup", label: "Follow-up Scope", description: "Classes allowed for performing follow-ups" },
  { key: "change_status", label: "Change Status Scope", description: "Classes allowed for updating enquiry status" },
  { key: "report", label: "Report Scope", description: "Classes allowed in reports" },
  { key: "export", label: "Export Scope", description: "Classes allowed to be exported" },
];

type AssignedScopeRow = {
  action_key?: string | null;
  scope_type: string;
  resource_id: string | null;
};

export function ScopesEditor({
  staffId,
  allClasses,
  assignedScopes,
}: {
  staffId: string;
  allClasses: { id: string; name: string }[];
  assignedScopes: AssignedScopeRow[];
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  // Helper to get initial state per action key
  function getInitialState() {
    const state: Record<ActionKey, { all: boolean; classes: string[] }> = {
      create: { all: false, classes: [] },
      view: { all: false, classes: [] },
      edit: { all: false, classes: [] },
      assign: { all: false, classes: [] },
      followup: { all: false, classes: [] },
      change_status: { all: false, classes: [] },
      report: { all: false, classes: [] },
      export: { all: false, classes: [] },
    };

    for (const row of assignedScopes ?? []) {
      const ak = (row.action_key ?? "ALL") as ActionKey | "ALL";
      const targetKeys: ActionKey[] = ak === "ALL" ? ACTION_CONFIG.map((a) => a.key) : [ak as ActionKey];

      for (const k of targetKeys) {
        if (state[k]) {
          if (row.scope_type === "ALL") state[k].all = true;
          if (row.scope_type === "CLASS" && row.resource_id) {
            if (!state[k].classes.includes(row.resource_id)) {
              state[k].classes.push(row.resource_id);
            }
          }
        }
      }
    }
    return state;
  }

  const [scopesState, setScopesState] = useState(getInitialState);

  function toggleAll(actionKey: ActionKey) {
    setScopesState((prev) => ({
      ...prev,
      [actionKey]: { ...prev[actionKey], all: !prev[actionKey].all },
    }));
  }

  function toggleClass(actionKey: ActionKey, classId: string) {
    setScopesState((prev) => {
      const currentClasses = prev[actionKey].classes;
      const nextClasses = currentClasses.includes(classId)
        ? currentClasses.filter((c) => c !== classId)
        : [...currentClasses, classId];
      return {
        ...prev,
        [actionKey]: { ...prev[actionKey], classes: nextClasses },
      };
    });
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const payload = ACTION_CONFIG.map((a) => ({
          actionKey: a.key,
          all: scopesState[a.key].all,
          classIds: scopesState[a.key].classes,
        }));

        const res = await setStaffActionScopes(staffId, payload);
        if (res?.error) {
          push(res.error, "error");
          return;
        }
        push("Action-specific Admission Enquiry scopes updated successfully!");
      } catch (e: any) {
        push(e?.message ?? String(e), "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {ACTION_CONFIG.map((config) => {
          const state = scopesState[config.key];
          return (
            <div key={config.key} className="rounded-lg border border-slate/15 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate/10 pb-2 mb-3">
                <div>
                  <h4 className="font-semibold text-sm text-ink-700">{config.label}</h4>
                  <p className="text-xs text-slate/60">{config.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate">
                  <input
                    type="checkbox"
                    checked={state.all}
                    onChange={() => toggleAll(config.key)}
                  />
                  <span>All Classes</span>
                </label>

                {!state.all && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 pl-2 pt-1 border-t border-slate/10">
                    {allClasses.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-xs text-slate/80">
                        <input
                          type="checkbox"
                          checked={state.classes.includes(c.id)}
                          onChange={() => toggleClass(config.key, c.id)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving Action Scopes…" : "Save Action Scopes"}
        </Button>
      </div>
    </div>
  );
}
