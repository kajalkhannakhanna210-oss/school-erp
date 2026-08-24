"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { setStaffActionScopes } from "@/app/(dashboard)/staff/actions";
import { ACTION_CONFIG, ActionKey } from "@/app/(dashboard)/staff/[id]/scopes-editor";

type Staff = {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  status: string;
};

type Class = {
  id: string;
  name: string;
  sort_order?: number;
};

type ScopeRow = {
  staff_id: string;
  resource_id: string | null;
  scope_type: string;
  action_key?: string | null;
};

interface StaffAssignmentRulesTableProps {
  staff: Staff[];
  classes: Class[];
  assignedScopes: ScopeRow[];
}

export function StaffAssignmentRulesTable({
  staff,
  classes,
  assignedScopes,
}: StaffAssignmentRulesTableProps) {
  const { push } = useToast();
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Map<string, ActionKey>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "assigned" | "unassigned">("all");

  const [staffScopesState, setStaffScopesState] = useState(() => {
    const map = new Map<string, Record<ActionKey, { all: boolean; classes: string[] }>>();

    for (const s of staff) {
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

      const userScopes = (assignedScopes ?? []).filter((r) => r.staff_id === s.id);
      for (const row of userScopes) {
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
      map.set(s.id, state);
    }
    return map;
  });

  const toggleAll = (staffId: string, actionKey: ActionKey) => {
    setStaffScopesState((prev) => {
      const nextMap = new Map(prev);
      const userState = nextMap.get(staffId)!;
      nextMap.set(staffId, {
        ...userState,
        [actionKey]: { ...userState[actionKey], all: !userState[actionKey].all },
      });
      return nextMap;
    });
  };

  const toggleClass = (staffId: string, actionKey: ActionKey, classId: string) => {
    setStaffScopesState((prev) => {
      const nextMap = new Map(prev);
      const userState = nextMap.get(staffId)!;
      const currentActionState = userState[actionKey];
      let effectiveClasses = currentActionState.all ? classes.map((c) => c.id) : [...currentActionState.classes];
      
      if (effectiveClasses.includes(classId)) {
        effectiveClasses = effectiveClasses.filter((c) => c !== classId);
      } else {
        effectiveClasses.push(classId);
      }

      nextMap.set(staffId, {
        ...userState,
        [actionKey]: { all: false, classes: effectiveClasses },
      });
      return nextMap;
    });
  };

  const handleSelectAllClassesForAction = (staffId: string, actionKey: ActionKey) => {
    setStaffScopesState((prev) => {
      const nextMap = new Map(prev);
      const userState = nextMap.get(staffId)!;
      nextMap.set(staffId, {
        ...userState,
        [actionKey]: { all: false, classes: classes.map((c) => c.id) },
      });
      return nextMap;
    });
  };

  const handleClearClassesForAction = (staffId: string, actionKey: ActionKey) => {
    setStaffScopesState((prev) => {
      const nextMap = new Map(prev);
      const userState = nextMap.get(staffId)!;
      nextMap.set(staffId, {
        ...userState,
        [actionKey]: { all: false, classes: [] },
      });
      return nextMap;
    });
  };

  const handleSave = async (staffId: string) => {
    setSaving(staffId);
    try {
      const userState = staffScopesState.get(staffId)!;
      const payload = ACTION_CONFIG.map((a) => ({
        actionKey: a.key,
        all: userState[a.key].all,
        classIds: userState[a.key].classes,
      }));

      const res = await setStaffActionScopes(staffId, payload);
      if (res?.error) {
        push(res.error, "error");
      } else {
        push("Action-specific rules updated successfully", "success");
        setExpandedStaff(null);
      }
    } catch (e: any) {
      push(e?.message || "Failed to save", "error");
    } finally {
      setSaving(null);
    }
  };

  const countConfiguredRules = (staffId: string) => {
    const userState = staffScopesState.get(staffId);
    if (!userState) return 0;
    let count = 0;
    for (const key of Object.keys(userState) as ActionKey[]) {
      if (userState[key].all || userState[key].classes.length > 0) {
        count++;
      }
    }
    return count;
  };

  const getStaffActiveTab = (staffId: string): ActionKey => {
    return activeTabMap.get(staffId) || "create";
  };

  const setStaffActiveTab = (staffId: string, tab: ActionKey) => {
    setActiveTabMap((prev) => new Map(prev).set(staffId, tab));
  };

  const filteredStaff = staff.filter((s) => {
    const rulesCount = countConfiguredRules(s.id);
    const matchesSearch =
      !searchQuery.trim() ||
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === "assigned") return rulesCount > 0;
    if (filterTab === "unassigned") return rulesCount === 0;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-100 bg-ink-50/50 pl-9 pr-3 text-sm text-ink-700 placeholder:text-slate-400 focus:border-gold-500 focus:bg-white focus:outline-none"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              filterTab === "all" ? "bg-ink-900 text-white shadow-xs" : "bg-ink-50 text-slate-600 hover:bg-ink-100"
            }`}
          >
            All Staff ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("assigned")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              filterTab === "assigned" ? "bg-emerald-600 text-white shadow-xs" : "bg-ink-50 text-slate-600 hover:bg-ink-100"
            }`}
          >
            Configured ({staff.filter((s) => countConfiguredRules(s.id) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("unassigned")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              filterTab === "unassigned" ? "bg-slate-700 text-white shadow-xs" : "bg-ink-50 text-slate-600 hover:bg-ink-100"
            }`}
          >
            Unassigned ({staff.filter((s) => countConfiguredRules(s.id) === 0).length})
          </button>
        </div>
      </div>

      {/* Staff Rule Accordion Cards */}
      <div className="space-y-3">
        {filteredStaff.map((s) => {
          const isExpanded = expandedStaff === s.id;
          const rulesCount = countConfiguredRules(s.id);
          const userState = staffScopesState.get(s.id)!;
          const activeAction = getStaffActiveTab(s.id);
          const currentActionState = userState[activeAction];
          const activeConfig = ACTION_CONFIG.find((c) => c.key === activeAction)!;

          return (
            <div
              key={s.id}
              className={`overflow-hidden rounded-xl border transition-all ${
                isExpanded ? "border-gold-400 bg-white ring-2 ring-gold-400/20 shadow-md" : "border-ink-100 bg-white hover:border-ink-200 hover:shadow-xs"
              }`}
            >
              {/* Header Card */}
              <button
                type="button"
                onClick={() => setExpandedStaff(isExpanded ? null : s.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-100 font-display text-sm font-bold text-ink-700 shadow-inner">
                    {s.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-ink-900">{s.full_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{s.email || "No email provided"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {rulesCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {rulesCount} / 8 Actions Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      No Access Configured
                    </span>
                  )}
                  <div className={`grid h-7 w-7 place-items-center rounded-lg bg-ink-50 transition-transform duration-200 ${isExpanded ? "rotate-180 bg-gold-100 text-gold-700" : "text-slate-400"}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Drawer Content */}
              {isExpanded && (
                <div className="border-t border-ink-100 bg-slate-50/40 p-4 sm:p-5">
                  {/* Action Tabs Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-ink-100 scrollbar-none">
                    {ACTION_CONFIG.map((cfg) => {
                      const isActive = activeAction === cfg.key;
                      const st = userState[cfg.key];
                      const hasRules = st.all || st.classes.length > 0;

                      return (
                        <button
                          key={cfg.key}
                          type="button"
                          onClick={() => setStaffActiveTab(s.id, cfg.key)}
                          className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            isActive
                              ? "bg-ink-900 text-white shadow-sm"
                              : "bg-white text-slate-700 hover:bg-ink-100 border border-ink-100"
                          }`}
                        >
                          <span>{cfg.label}</span>
                          {hasRules && (
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isActive ? "bg-gold-400" : "bg-emerald-500"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Action Panel */}
                  <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4 shadow-xs">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-ink-900">{activeConfig.label}</h4>
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                            Action Scope
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{activeConfig.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/70 px-3 py-1.5 text-xs font-semibold text-ink-800 transition hover:bg-ink-100">
                          <input
                            type="checkbox"
                            checked={currentActionState.all}
                            onChange={() => toggleAll(s.id, activeAction)}
                            className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                          />
                          <span>All Classes Access</span>
                        </label>
                        {!currentActionState.all && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSelectAllClassesForAction(s.id, activeAction)}
                              className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 border border-ink-200 hover:bg-ink-50 shadow-2xs"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearClassesForAction(s.id, activeAction)}
                              className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-2xs"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Class Selector Tiles */}
                    <div className="mt-4">
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {classes.map((cls) => {
                          const isChecked = currentActionState.all || currentActionState.classes.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                isChecked
                                  ? "border-gold-500 bg-gold-50/70 font-semibold text-ink-900 shadow-2xs"
                                  : "border-ink-100 bg-white text-slate-700 hover:border-ink-200 hover:bg-ink-50/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleClass(s.id, activeAction, cls.id)}
                                className="h-4 w-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                              />
                              <span className="truncate">{cls.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Save Footer */}
                  <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                    <p className="text-xs text-slate-500">
                      Changes apply immediately to API authorization checks upon saving.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setExpandedStaff(null)} variant="outline" className="h-9 px-4 text-xs">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSave(s.id)}
                        disabled={saving === s.id}
                        className="h-9 px-4 text-xs font-semibold shadow-sm bg-gold-500 hover:bg-gold-600 text-ink-900"
                      >
                        {saving === s.id ? "Saving Scope Rules..." : "Save Staff Assignment Rules"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="rounded-xl border border-ink-100 bg-white p-12 text-center text-sm text-slate-500">
            No staff members match the current search or filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}