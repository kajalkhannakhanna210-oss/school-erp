"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { ExportLeavingStudentsButtons } from "./export-leaving-students-buttons";

interface LeavingFiltersProps {
  filters: {
    query?: string;
    classId?: string;
    sectionId?: string;
    sessionId?: string;
    status?: string;
    clearanceStatus?: string;
    reason?: string;
  };
  classes: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  sessions: { id: string; name: string }[];
  statusLabels: Record<string, string>;
  reasonLabels: Record<string, string>;
  requests: any[];
}

export function LeavingStudentsFilters({
  filters,
  classes,
  sections,
  sessions,
  statusLabels,
  reasonLabels,
  requests,
}: LeavingFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const val = String(value).trim();
      if (val) {
        params.set(key, val);
      }
    }

    startTransition(() => {
      router.push(`/leaving-students?${params.toString()}`, { scroll: false });
    });
  };

  const activeFilterCount = [
    filters.query,
    filters.classId,
    filters.sectionId,
    filters.sessionId,
    filters.status,
    filters.clearanceStatus,
    filters.reason,
  ].filter(Boolean).length;

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 sm:p-5">
      {/* Header bar with mobile toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Search & Directory Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-800">
                {activeFilterCount} active
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            <span>🔍</span>
            <span>{showMobileFilters ? "Hide" : "Filter"}</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-gold-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ExportLeavingStudentsButtons requests={requests} />
        </div>
      </div>

      {/* Filter Form - Collapsible on Mobile */}
      <form
        onSubmit={handleSubmit}
        className={`${showMobileFilters ? "grid" : "hidden sm:grid"} gap-3 sm:grid-cols-2 lg:grid-cols-4`}
      >
        <div>
          <Label>Search</Label>
          <Input name="q" defaultValue={filters.query} placeholder="Student, ADM, Certificate No." />
        </div>
        <div>
          <Label>Class</Label>
          <select
            name="classId"
            defaultValue={filters.classId ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Section</Label>
          <select
            name="sectionId"
            defaultValue={filters.sectionId ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Academic Session</Label>
          <select
            name="sessionId"
            defaultValue={filters.sessionId ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Clearance Status</Label>
          <select
            name="clearanceStatus"
            defaultValue={filters.clearanceStatus ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">Any clearance</option>
            <option value="cleared">Cleared</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <Label>Leaving Reason</Label>
          <select
            name="reason"
            defaultValue={filters.reason ?? ""}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm"
          >
            <option value="">All reasons</option>
            {Object.entries(reasonLabels).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pt-1 sm:pt-0">
          <Button type="submit" variant="primary" disabled={isPending} className="flex-1 gap-2">
            {isPending ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <span>Apply Filters</span>
            )}
          </Button>
          <Link href="/leaving-students">
            <Button type="button" variant="outline" disabled={isPending}>
              Reset
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
