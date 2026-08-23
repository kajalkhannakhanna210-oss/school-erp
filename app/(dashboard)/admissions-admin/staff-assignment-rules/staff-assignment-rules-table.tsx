"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { setStaffModuleScopes } from "@/app/(dashboard)/staff/actions";

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

interface StaffAssignmentRulesTableProps {
  staff: Staff[];
  classes: Class[];
  staffClassMap: Map<string, string[]>;
}

export function StaffAssignmentRulesTable({
  staff,
  classes,
  staffClassMap,
}: StaffAssignmentRulesTableProps) {
  const { push } = useToast();
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [classSelections, setClassSelections] = useState<Map<string, Set<string>>>(
    new Map(
      staff.map((s) => [
        s.id,
        new Set(staffClassMap.get(s.id) || []),
      ])
    )
  );

  const handleToggleClass = (staffId: string, classId: string) => {
    setClassSelections((prev) => {
      const newMap = new Map(prev);
      const staffClasses = new Set(newMap.get(staffId) || []);
      if (staffClasses.has(classId)) {
        staffClasses.delete(classId);
      } else {
        staffClasses.add(classId);
      }
      newMap.set(staffId, staffClasses);
      return newMap;
    });
  };

  const handleSave = async (staffId: string) => {
    setSaving(staffId);
    try {
      const selectedClasses = Array.from(classSelections.get(staffId) || []);
      const res = await setStaffModuleScopes(staffId, selectedClasses);
      if (res?.error) {
        push(res.error, "error");
      } else {
        push("Classes assigned successfully", "success");
        setExpandedStaff(null);
      }
    } catch (e: any) {
      push(e?.message || "Failed to save", "error");
    } finally {
      setSaving(null);
    }
  };

  if (!staff.length) {
    return (
      <div className="rounded-lg border border-ink-100 bg-white p-6 text-center text-sm text-slate-600">
        No staff members found.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-ink-100 bg-white shadow-sm">
      {staff.map((s) => (
        <div key={s.id} className="border-b last:border-b-0">
          <button
            onClick={() =>
              setExpandedStaff(expandedStaff === s.id ? null : s.id)
            }
            className="w-full px-4 py-3 text-left hover:bg-ink-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-ink-900">{s.full_name}</p>
                <p className="text-sm text-slate-600">{s.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink-700">
                    {classSelections.get(s.id)?.size || 0} classes
                  </div>
                  <div className="text-xs text-slate-500">assigned</div>
                </div>
                <svg
                  className={`h-5 w-5 text-slate-400 transition-transform ${
                    expandedStaff === s.id ? "rotate-180" : ""
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>
          </button>

          {expandedStaff === s.id && (
            <div className="border-t bg-ink-50 px-4 py-4">
              <p className="mb-3 text-sm font-semibold text-ink-900">
                Select Classes for {s.full_name}
              </p>
              <div className="mb-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={classSelections.get(s.id)?.has(cls.id) || false}
                      onChange={() => handleToggleClass(s.id, cls.id)}
                      className="h-4 w-4 rounded border-ink-300 text-ink-700"
                    />
                    <span className="text-sm text-ink-900">{cls.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setExpandedStaff(null)}
                  variant="secondary"
                  className="h-10 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSave(s.id)}
                  disabled={saving === s.id}
                  className="h-10 px-4 text-sm"
                >
                  {saving === s.id ? "Saving..." : "Save Classes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
