"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
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

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [classId, setClassId] = useState(searchParams.get("class") ?? "");
  const [sectionId, setSectionId] = useState(searchParams.get("section") ?? "");

  const filteredSections = sections.filter((s) => !classId || s.class_id === classId);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classId) params.set("class", classId);
    if (sectionId) params.set("section", sectionId);
    router.push(`/students?${params.toString()}`);
  }

  function clearFilters() {
    setQ("");
    setClassId("");
    setSectionId("");
    router.push("/students");
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <Input
          placeholder="Search name, admission no, mobile"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
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
      <select
        className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        disabled={!classId}
      >
        <option value="">All sections</option>
        {filteredSections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="ghost">
        Apply
      </Button>
      <Button type="button" variant="ghost" onClick={clearFilters}>
        Clear
      </Button>
    </form>
  );
}
