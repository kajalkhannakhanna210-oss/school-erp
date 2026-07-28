"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createStaff, updateStaff } from "./actions";

type FormState = {
  full_name: string;
  contact_email: string;
  department: string;
  designation: string;
  qualification: string;
  mobile_number: string;
  salary: string;
  joining_date: string;
};

export function StaffForm({
  mode,
  staffId,
  initial,
}: {
  mode: "create" | "edit";
  staffId?: string;
  initial?: Partial<FormState>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    full_name: initial?.full_name ?? "",
    contact_email: initial?.contact_email ?? "",
    department: initial?.department ?? "",
    designation: initial?.designation ?? "",
    qualification: initial?.qualification ?? "",
    mobile_number: initial?.mobile_number ?? "",
    salary: initial?.salary ?? "",
    joining_date: initial?.joining_date ?? new Date().toISOString().slice(0, 10),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "create") {
        const result = await createStaff(form);
        // On success createStaff redirects server-side and never returns;
        // reaching this line means it returned an error instead.
        if (result?.error) {
          push(result.error, "error");
        }
        return;
      }

      const result = await updateStaff(staffId!, form);
      if (result.error) {
        push(result.error, "error");
        return;
      }
      push("Staff member updated");
      router.push(`/staff/${staffId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-lg text-ink-700">Basic details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
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
          <div>
            <Label htmlFor="mobile_number">Mobile number</Label>
            <Input
              id="mobile_number"
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="qualification">Qualification</Label>
            <Input
              id="qualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg text-ink-700">Employment</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salary">Salary</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="0.01"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="joining_date">Joining date</Label>
              <Input
                id="joining_date"
                type="date"
                required
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : mode === "create" ? "Add staff member" : "Save changes"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
