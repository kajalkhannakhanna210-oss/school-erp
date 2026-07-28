"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

type Option = { id: string; name: string };
type AssignedPair = { class_id: string; section_id: string; label: string };

const today = new Date().toISOString().slice(0, 10);

export function ClassSectionPicker(
  props:
    | { mode: "full"; classes: Option[]; sections: (Option & { class_id: string })[] }
    | { mode: "assigned"; pairs: AssignedPair[] }
) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [pairKey, setPairKey] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("date", date);
    if (props.mode === "full") {
      if (!classId || !sectionId) return;
      params.set("class", classId);
      params.set("section", sectionId);
    } else {
      if (!pairKey) return;
      const [c, s] = pairKey.split(":");
      params.set("class", c);
      params.set("section", s);
    }
    router.push(`/attendance?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {props.mode === "full" ? (
        <>
          <select
            className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
            required
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">Select class</option>
            {props.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
            required
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
          >
            <option value="">Select section</option>
            {props.sections
              .filter((s) => s.class_id === classId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </>
      ) : (
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          required
          value={pairKey}
          onChange={(e) => setPairKey(e.target.value)}
        >
          <option value="">Select class</option>
          {props.pairs.map((p) => (
            <option key={`${p.class_id}:${p.section_id}`} value={`${p.class_id}:${p.section_id}`}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <div>
        <Input type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Button type="submit">View / Mark</Button>
    </form>
  );
}
