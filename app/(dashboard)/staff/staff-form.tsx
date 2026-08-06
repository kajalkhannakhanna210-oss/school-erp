"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createStaffFromForm, updateStaffFromForm } from "./actions";

type FormState = {
  photo_url?: string | null;
  full_name: string;
  contact_email: string;
  temporary_password: string;
  department: string;
  designation: string;
  qualification: string;
  mobile_number: string;
  salary: string;
  joining_date: string;
};

type SubmitState = { error: string | null; message?: string; id?: string | null };
const initialSubmitState: SubmitState = { error: null };

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : mode === "create" ? "Add staff member" : "Save changes"}</Button>;
}

export function StaffForm({
  mode,
  staffId,
  initial,
}: {
  mode: "create" | "edit";
  staffId?: string;
  initial?: Partial<FormState>;
}) {
  const { push } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    full_name: initial?.full_name ?? "",
    contact_email: initial?.contact_email ?? "",
    temporary_password: "",
    department: initial?.department ?? "",
    designation: initial?.designation ?? "",
    qualification: initial?.qualification ?? "",
    mobile_number: initial?.mobile_number ?? "",
    salary: initial?.salary ?? "",
    joining_date: initial?.joining_date ?? new Date().toISOString().slice(0, 10),
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photo_url ?? null);
  const action = mode === "create" ? createStaffFromForm : updateStaffFromForm.bind(null, staffId!);
  const [submitState, formAction] = useFormState(action, initialSubmitState);
  const successMessage = "message" in submitState ? submitState.message : undefined;
  useEffect(() => {
    if (!successMessage) return;
    push(successMessage);
    if (mode === "edit") return;
    setForm({ full_name: "", contact_email: "", temporary_password: "", department: "", designation: "", qualification: "", mobile_number: "", salary: "", joining_date: new Date().toISOString().slice(0, 10) });
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [successMessage, mode]);

  useEffect(() => {
    if (submitState.error?.toLowerCase().includes("mobile")) {
      mobileInputRef.current?.focus();
    }
  }, [submitState.error]);

  return (
    <form action={formAction} noValidate className="grid gap-6 lg:grid-cols-2">
      {submitState.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger lg:col-span-2">{submitState.error}</p>}
      <Card>
        <h2 className="font-display text-lg text-ink-700">Basic details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          {mode === "create" && (
            <>
              <div>
                <Label htmlFor="contact_email">Email (used for login)</Label>
                <Input id="contact_email" name="contact_email" type="email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="temporary_password">Temporary password</Label>
                <Input id="temporary_password" name="temporary_password" type="password" autoComplete="new-password" minLength={8} required value={form.temporary_password} onChange={(e) => setForm({ ...form, temporary_password: e.target.value })} />
                <p className="mt-1 text-xs text-slate/60">Share this password securely with the staff member.</p>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="mobile_number">Mobile number</Label>
              <Input
                id="mobile_number"
                name="mobile_number"
                ref={mobileInputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
                required
                placeholder="10-digit mobile number"
                value={form.mobile_number}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
          </div>
          <div>
            <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                name="qualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="photo_file">Profile image</Label>
            {photoPreview && <img src={photoPreview} alt="Profile preview" className="mb-3 h-24 w-24 rounded-lg object-cover" />}
            <Input ref={photoInputRef} id="photo_file" name="photo_file" type="file" accept="image/*" className="px-2 py-2" onChange={(e) => {
              const file = e.target.files?.[0];
              setPhotoPreview(file ? URL.createObjectURL(file) : null);
            }} />
            <p className="mt-1 text-xs text-slate/60">Optional. Upload a profile photo.</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg text-ink-700">Employment</h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="salary">Salary</Label>
              <Input
                id="salary"
                name="salary"
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
                name="joining_date"
                type="date"
                required
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>
          </div>
          <SaveButton mode={mode} />
        </div>
      </Card>
    </form>
  );
}
