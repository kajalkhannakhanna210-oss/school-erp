"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";

type Option = { id: string; name: string };
type AssignedPair = { class_id: string; section_id: string; label: string };

export function MarksPicker(
  props:
    | { mode: "full"; exams: Option[]; classes: Option[]; sections: (Option & { class_id: string })[] }
    | { mode: "assigned"; exams: Option[]; pairs: AssignedPair[] }
) {
  const router = useRouter();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [pairKey, setPairKey] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!examId) return;
    const params = new URLSearchParams();
    params.set("exam", examId);
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
    router.push(`/exams/marks?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <select
        className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
        required
        value={examId}
        onChange={(e) => setExamId(e.target.value)}
      >
        <option value="">Select exam</option>
        {props.exams.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>
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
      <Button type="submit">Load</Button>
    </form>
  );
}
