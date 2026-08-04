"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import type { ReportType } from "@/lib/reports";

type Option = { id: string; name: string };

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + "01";

export function ReportFilters({
  type,
  classes,
  sections,
}: {
  type: ReportType;
  classes: Option[];
  sections: (Option & { class_id: string })[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams?.get("from") ?? monthStart);
  const [to, setTo] = useState(searchParams?.get("to") ?? today);
  const [groupBy, setGroupBy] = useState(searchParams?.get("groupBy") ?? "month");
  const [classId, setClassId] = useState(searchParams?.get("class") ?? "");
  const [sectionId, setSectionId] = useState(searchParams?.get("section") ?? "");

  const needsDateRange = type === "collection" || type === "attendance";
  const needsClass = type === "pending-fees" || type === "concessions" || type === "late-fees" || type === "attendance";
  const needsSection = type === "pending-fees" || type === "late-fees" || type === "attendance";
  const needsGroupBy = type === "collection";

  function apply(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ type });
    if (needsDateRange) {
      params.set("from", from);
      params.set("to", to);
    }
    if (needsGroupBy) params.set("groupBy", groupBy);
    if (needsClass && classId) params.set("class", classId);
    if (needsSection && sectionId) params.set("section", sectionId);
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      {needsDateRange && (
        <>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate/60">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate/60">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </>
      )}
      {needsGroupBy && (
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
        >
          <option value="month">By month</option>
          <option value="day">By day</option>
        </select>
      )}
      {needsClass && (
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId("");
          }}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {needsSection && (
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={!classId}
        >
          <option value="">All sections</option>
          {sections
            .filter((s) => s.class_id === classId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      )}
      <Button type="submit" variant="ghost">
        Run report
      </Button>
    </form>
  );
}
