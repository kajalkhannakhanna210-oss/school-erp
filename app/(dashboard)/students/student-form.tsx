"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createStudent, updateStudent } from "./actions";

type Option = { id: string; name: string };

type FormState = {
  full_name: string;
  contact_email: string;
  roll_number: string;
  father_name: string;
  mother_name: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  address: string;
  mobile_number: string;
  class_id: string;
  section_id: string;
  session_id: string;
  admission_date: string;
};

export function StudentForm({
  mode,
  studentId,
  initial,
  classes,
  sections,
  sessions,
}: {
  mode: "create" | "edit";
  studentId?: string;
  initial?: Partial<FormState>;
  classes: Option[];
  sections: (Option & { class_id: string })[];
  sessions: Option[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    full_name: initial?.full_name ?? "",
    contact_email: initial?.contact_email ?? "",
    roll_number: initial?.roll_number ?? "",
    father_name: initial?.father_name ?? "",
    mother_name: initial?.mother_name ?? "",
    gender: initial?.gender ?? "",
    date_of_birth: initial?.date_of_birth ?? "",
    blood_group: initial?.blood_group ?? "",
    address: initial?.address ?? "",
    mobile_number: initial?.mobile_number ?? "",
    class_id: initial?.class_id ?? "",
    section_id: initial?.section_id ?? "",
    session_id: initial?.session_id ?? "",
    admission_date: initial?.admission_date ?? new Date().toISOString().slice(0, 10),
  });

  const filteredSections = sections.filter((s) => s.class_id === form.class_id);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "create") {
        const result = await createStudent(form);
        // On success createStudent redirects server-side and never returns;
        // reaching this line means it returned an error instead.
        if (result?.error) {
          push(result.error, "error");
        }
        return;
      }

      const result = await updateStudent(studentId!, form);
      if (result.error) {
        push(result.error, "error");
        return;
      }
      push("Student updated");
      router.push(`/students/${studentId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-lg text-ink-700">Basic details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="full_name">Student name</Label>
            <Input
              id="full_name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          {mode === "create" && (
            <div>
              <Label htmlFor="contact_email">Email (used for login)</Label>
              <Input
                id="contact_email"
                type="email"
                required
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="roll_number">Roll number</Label>
              <Input
                id="roll_number"
                value={form.roll_number}
                onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="blood_group">Blood group</Label>
              <Input
                id="blood_group"
                placeholder="O+"
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="mobile_number">Mobile number</Label>
            <Input
              id="mobile_number"
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg text-ink-700">Family & admission</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="father_name">Father&apos;s name</Label>
            <Input
              id="father_name"
              value={form.father_name}
              onChange={(e) => setForm({ ...form, father_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="mother_name">Mother&apos;s name</Label>
            <Input
              id="mother_name"
              value={form.mother_name}
              onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="session_id">Academic session</Label>
            <select
              id="session_id"
              required
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              value={form.session_id}
              onChange={(e) => setForm({ ...form, session_id: e.target.value })}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class_id">Class</Label>
              <select
                id="class_id"
                required
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: "" })}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="section_id">Section</Label>
              <select
                id="section_id"
                required
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                value={form.section_id}
                onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                disabled={!form.class_id}
              >
                <option value="">Select section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="admission_date">Admission date</Label>
            <Input
              id="admission_date"
              type="date"
              required
              value={form.admission_date}
              onChange={(e) => setForm({ ...form, admission_date: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : mode === "create" ? "Add student" : "Save changes"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
