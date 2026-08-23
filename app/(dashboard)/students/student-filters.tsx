"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

type Option = { id: string; name: string };

export function StudentFilters({
  classes,
  sections,
}: {
  classes: Option[];
  sections: (Option & { class_id: string })[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const [classId, setClassId] = useState(searchParams?.get("class") ?? "");
  const [sectionId, setSectionId] = useState(searchParams?.get("section") ?? "");
  const [admission, setAdmission] = useState(searchParams?.get("admission") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const toggle = () => setFiltersOpen((open) => !open);
    window.addEventListener("toggle-student-filters", toggle);
    return () => window.removeEventListener("toggle-student-filters", toggle);
  }, []);

  const filteredSections = sections.filter((s) => !classId || s.class_id === classId);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classId) params.set("class", classId);
    if (sectionId) params.set("section", sectionId);
    if (admission) params.set("admission", admission);
    startTransition(() => router.push(`/students?${params.toString()}`));
  }

  function clearFilters() {
    setQ("");
    setClassId("");
    setSectionId("");
    setAdmission("");
    router.push("/students");
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2">
      <div className={`${filtersOpen ? "flex" : "hidden"} w-full flex-wrap items-end gap-2 md:flex md:w-auto`}>
        <select
          className="min-h-10 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 shadow-sm md:w-auto"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId("");
          }}
        >
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="min-h-10 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 shadow-sm md:w-auto" value={admission} onChange={(e) => setAdmission(e.target.value)} aria-label="Admission number status">
          <option value="">All admission numbers</option>
          <option value="assigned">With admission number</option>
          <option value="unassigned">Without admission number</option>
        </select>
        <select className="min-h-10 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 shadow-sm md:w-auto" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!classId}>
          <option value="">All sections</option>
          {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Button type="submit" className="min-h-10" disabled={pending}>{pending ? "Applying…" : "Apply"}</Button>
        <Button type="button" variant="ghost" className="min-h-10 bg-white" onClick={clearFilters}>Clear</Button>
      </div>
      <div className="order-last w-full md:order-none md:ml-auto md:w-72">
        <Input className="mt-0 min-h-10"
          placeholder="Search name, Adm No, mobile"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
    </form>
  );
}
