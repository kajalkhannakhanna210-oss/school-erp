"use client";
import { useRef, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { allotAdmissionNumber } from "../actions";

type Student = {
  id: string;
  admission_number: string;
  mobile_number: string | null;
  photo_url: string | null;
  section_id: string | null;
  profiles: { full_name: string } | null;
  classes: { name: string } | null;
  sections: { name: string } | null;
};

export function AdmissionAllotmentForm({
  students,
  sections,
  nextAdmissionNumber = 1,
}: {
  students: Student[];
  sections: { id: string; name: string; class_id: string }[];
  nextAdmissionNumber?: number;
}) {
  const { push } = useToast();
  const existing = new Set(
    students.map((s) => s.admission_number).filter(Boolean),
  );
  const suggested = (index: number) => {
    let next = nextAdmissionNumber + index;
    let value = `ADM${new Date().getFullYear()}${String(next).padStart(4, "0")}`;
    while (existing.has(value))
      value = `ADM${new Date().getFullYear()}${String(++next).padStart(4, "0")}`;
    return value;
  };
  const initialValues = Object.fromEntries(
    students.map((s, index) => [s.id, s.admission_number || suggested(index)]),
  );
  const [values, setValues] = useState(initialValues);
  const previousValues = useRef(initialValues);
  const [sectionValues, setSectionValues] = useState(
    Object.fromEntries(students.map((s) => [s.id, s.section_id ?? ""])),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const update = (id: string, value: string) => {
    const next = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (
      next &&
      Object.entries(previousValues.current).some(
        ([other, current]) => other !== id && current === next,
      )
    ) {
      push("Duplicate admission number. Previous value restored.", "error");
      return;
    }
    previousValues.current[id] = next;
    setValues((current) => ({ ...current, [id]: next }));
  };
  const save = (ids: string[]) => {
    if (ids.some((id) => !values[id]?.trim())) {
      push("Enter an admission number for every selected row.", "error");
      return;
    }
    if (ids.some((id) => !sectionValues[id]?.trim())) {
      push("Section selection is compulsory for every selected row.", "error");
      return;
    }
    startTransition(async () => {
      for (const id of ids) {
        const result = await allotAdmissionNumber(
          id,
          values[id],
          sectionValues[id],
        );
        if (result.error) {
          push(result.error, "error");
          return;
        }
      }
      setSelected([]);
      push("Admission details saved");
    });
  };
  const selectAll = () =>
    setSelected(
      selected.length === students.length
        ? []
        : students.map((student) => student.id),
    );
  const sectionOptions = (s: Student) =>
    sections.filter(
      (section) => !s.classes || section.class_id === (s.classes as any).id,
    );
  const row = (s: Student, mobile = false) => {
    const isSelected = selected.includes(s.id);
    return (
      <div
        key={s.id}
        className={
          mobile
            ? `space-y-3 border-b border-ink-100 p-3 transition-colors last:border-0 ${
                isSelected ? "bg-[#e6f4ea]" : ""
              }`
            : ""
        }
      >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected.includes(s.id)}
          onChange={(e) =>
            setSelected(
              e.target.checked
                ? [...selected, s.id]
                : selected.filter((id) => id !== s.id),
            )
          }
        />
        {s.photo_url ? (
          <img
            src={s.photo_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-700">
            {(s.profiles?.full_name ?? "S").slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-700">
            {s.profiles?.full_name || "Unnamed student"}
          </span>
          {mobile && (
            <span className="block truncate text-xs text-slate/60">
              {s.classes?.name || "No class"}
              {s.sections?.name && ` · ${s.sections.name}`}
            </span>
          )}
        </span>
      </div>
      <div className={mobile ? "grid grid-cols-2 gap-2" : ""}>
        <select
          value={sectionValues[s.id] ?? ""}
          required
          onChange={(e) =>
            setSectionValues({ ...sectionValues, [s.id]: e.target.value })
          }
          className="min-h-10 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select section *</option>
          {sectionOptions(s).map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
        <input
          value={values[s.id] ?? ""}
          onChange={(e) => update(s.id, e.target.value)}
          className="min-h-10 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm uppercase shadow-sm"
        />
      </div>
      {mobile && (
        <Button
          type="button"
          className="w-full bg-ink-700 text-white hover:bg-ink-600"
          disabled={pending}
          onClick={() => save([s.id])}
        >
          Save
        </Button>
      )}
    </div>
    );
  };
  return (
    <Card className="border-ink-100 p-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5">
        <h2 className="font-display text-lg font-semibold text-ink-700">
          Admission numbers
        </h2>
        <Button
          className="bg-ink-700 text-white hover:bg-ink-600"
          disabled={!selected.length || pending}
          onClick={() => save(selected)}
        >
          Save selected ({selected.length})
        </Button>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-slate/50">
              <th className="px-4 py-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="Select all students"
                    checked={students.length > 0 && selected.length === students.length}
                    onChange={selectAll}
                  />
                  Select all
                </label>
              </th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Admission number</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const isSelected = selected.includes(s.id);
              return (
                <tr
                  key={s.id}
                  className={`border-b border-ink-100 transition-colors last:border-0 ${
                    isSelected
                      ? "bg-[#e6f4ea] hover:bg-[#d4edda]"
                      : "hover:bg-ink-50/40"
                  }`}
                >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, s.id]
                          : selected.filter((id) => id !== s.id),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 font-semibold">
                    {s.photo_url ? <img src={s.photo_url} alt={`${s.profiles?.full_name || "Student"} photo`} className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">{(s.profiles?.full_name ?? "S").slice(0, 2).toUpperCase()}</span>}
                    <span>{s.profiles?.full_name || "Unnamed student"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{s.classes?.name || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={sectionValues[s.id] ?? ""}
                    required
                    onChange={(e) =>
                      setSectionValues({
                        ...sectionValues,
                        [s.id]: e.target.value,
                      })
                    }
                    className="min-h-10 w-40 rounded-lg border px-3"
                  >
                    <option value="">Select section *</option>
                    {sectionOptions(s).map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    value={values[s.id] ?? ""}
                    onChange={(e) => update(s.id, e.target.value)}
                    className="min-h-10 w-44 rounded-lg border px-3 uppercase"
                  />
                </td>
                <td className="px-4 py-3">
                  <Button
                    className="bg-ink-700 text-white hover:bg-ink-600"
                    disabled={pending}
                    onClick={() => save([s.id])}
                  >
                    Save
                  </Button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-ink-100 md:hidden">
        {students.map((s) => row(s, true))}
      </div>
      {!students.length && (
        <p className="p-8 text-center text-sm text-slate/60">
          No student records found.
        </p>
      )}
    </Card>
  );
}
