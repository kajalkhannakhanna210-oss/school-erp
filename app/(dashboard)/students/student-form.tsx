"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { createStudent, updateStudent } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { setStudentPhoto } from "./actions";

type Option = { id: string; name: string };

type FormState = {
  full_name: string;
  contact_email: string;
  temporary_password: string;
  roll_number: string;
  admission_number: string;
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
  existingPhotoUrl,
  classes,
  sections,
  sessions,
}: {
  mode: "create" | "edit";
  studentId?: string;
  initial?: Partial<FormState>;
  existingPhotoUrl?: string | null;
  classes: Option[];
  sections: (Option & { class_id: string })[];
  sessions: Option[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    existingPhotoUrl ?? null,
  );
  const admissionInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const [form, setForm] = useState<FormState>({
    full_name: initial?.full_name ?? "",
    contact_email: initial?.contact_email ?? "",
    temporary_password: "",
    roll_number: initial?.roll_number ?? "",
    admission_number: initial?.admission_number ?? "",
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
    admission_date:
      initial?.admission_date ?? new Date().toISOString().slice(0, 10),
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
          return;
        }
        if (photo && result?.id) {
          if (
            !photo.type.startsWith("image/") ||
            photo.size > 5 * 1024 * 1024
          ) {
            push("Photo must be an image up to 5 MB.", "error");
            return;
          }
          const path = `${result.id}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
          const { error: uploadError } = await createClient()
            .storage.from("student-photos")
            .upload(path, photo, { upsert: true });
          if (uploadError) {
            push(uploadError.message, "error");
            return;
          }
          const photoResult = await setStudentPhoto(result.id, path);
          if (photoResult.error) {
            push(photoResult.error, "error");
            return;
          }
        }
        setForm({
          full_name: "",
          contact_email: "",
          temporary_password: "",
          roll_number: "",
          admission_number: "",
          father_name: "",
          mother_name: "",
          gender: "",
          date_of_birth: "",
          blood_group: "",
          address: "",
          mobile_number: "",
          class_id: "",
          section_id: "",
          session_id: "",
          admission_date: new Date().toISOString().slice(0, 10),
        });
        setPhoto(null);
        setPhotoPreview(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
        push("Student added successfully");
        return;
      }

      const result = await updateStudent(studentId!, form);
      if (result.error) {
        push(result.error, "error");
        if (result.error.toLowerCase().includes("admission number")) {
          requestAnimationFrame(() => admissionInputRef.current?.focus());
        }
        return;
      }
      if (photo) {
        if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) {
          push("Photo must be an image up to 5 MB.", "error");
          return;
        }
        const path = `${studentId}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await createClient()
          .storage.from("student-photos")
          .upload(path, photo, { upsert: true });
        if (uploadError) {
          push(uploadError.message, "error");
          return;
        }
        const photoResult = await setStudentPhoto(studentId!, path);
        if (photoResult.error) {
          push(photoResult.error, "error");
          return;
        }
      }
      push("Student updated successfully");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-lg text-ink-700">Basic details</h2>
        <div className="mt-4 space-y-4">
          {mode === "create" && (
            <div>
              <Label htmlFor="student-photo">Student photo</Label>
              <div className="mt-1.5 flex flex-col gap-4 rounded-xl border border-gold-300 bg-gold-50/40 p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-gold-200 bg-white text-center text-xs text-slate/50">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Selected student preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Photo preview"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    ref={photoInputRef}
                    id="student-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate"
                  />
                  <p className="mt-1 text-xs text-slate/60">
                    Optional · JPG, PNG, or WebP up to 5 MB
                  </p>
                </div>
              </div>
            </div>
          )}
          {mode === "edit" && (
            <div className="rounded-xl border border-gold-300 bg-gold-50/40 p-3">
              <Label htmlFor="student-photo-edit">Replace student photo</Label>
              <input
                id="student-photo-edit"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm text-slate"
              />
              <p className="mt-1 text-xs text-slate/60">
                Optional · JPG, PNG, or WebP up to 5 MB
              </p>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Selected student preview"
                  className="mt-2 h-20 w-20 rounded-lg object-cover"
                />
              )}
            </div>
          )}
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
            <>
              <div>
                <Label htmlFor="contact_email">Email (used for login)</Label>
                <Input
                  id="contact_email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  required
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="temporary_password">Temporary password</Label>
                <Input
                  id="temporary_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.temporary_password}
                  onChange={(e) =>
                    setForm({ ...form, temporary_password: e.target.value })
                  }
                />
                <p className="mt-1 text-xs text-slate/60">
                  Give this password to the student securely. No email
                  invitation will be sent.
                </p>
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "create" && (
              <div>
                <Label htmlFor="admission_number">Admission number</Label>
                <Input
                  id="admission_number"
                  placeholder="Optional — auto-generated if blank"
                  value={form.admission_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      admission_number: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, ""),
                    })
                  }
                />
                <p className="mt-1 text-xs text-slate/60">
                  Optional. A unique admission number will be generated if left
                  blank.
                </p>
              </div>
            )}
            {mode === "edit" && (
              <div>
                <Label htmlFor="admission_number_edit">Admission number</Label>
                <Input
                  ref={admissionInputRef}
                  id="admission_number_edit"
                  value={form.admission_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      admission_number: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, ""),
                    })
                  }
                />
                <p className="mt-1 text-xs text-slate/60">
                  Update or assign the admission number.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="roll_number">Roll number</Label>
              <Input
                id="roll_number"
                value={form.roll_number}
                onChange={(e) =>
                  setForm({ ...form, roll_number: e.target.value })
                }
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm({ ...form, date_of_birth: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="blood_group">Blood group</Label>
              <Input
                id="blood_group"
                placeholder="O+"
                value={form.blood_group}
                onChange={(e) =>
                  setForm({ ...form, blood_group: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="mobile_number">Mobile number</Label>
            <Input
              id="mobile_number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              value={form.mobile_number}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
            />
            <p className="mt-1 text-xs text-slate/60">
              Optional · enter a valid 10-digit mobile number starting with 6–9.
            </p>
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
        <h2 className="font-display text-lg text-ink-700">
          Family & admission
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="father_name">Father&apos;s name</Label>
            <Input
              id="father_name"
              value={form.father_name}
              onChange={(e) =>
                setForm({ ...form, father_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="mother_name">Mother&apos;s name</Label>
            <Input
              id="mother_name"
              value={form.mother_name}
              onChange={(e) =>
                setForm({ ...form, mother_name: e.target.value })
              }
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="class_id">Class</Label>
              <select
                id="class_id"
                required={mode === "edit"}
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                value={form.class_id}
                onChange={(e) =>
                  setForm({ ...form, class_id: e.target.value, section_id: "" })
                }
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
              <Label
                htmlFor="section_id"
                className={mode === "create" ? "hidden" : ""}
              >
                Section
              </Label>
              <select
                id="section_id"
                required={mode === "edit"}
                className={`mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm ${mode === "create" ? "hidden" : ""}`}
                value={form.section_id}
                onChange={(e) =>
                  setForm({ ...form, section_id: e.target.value })
                }
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
              onChange={(e) =>
                setForm({ ...form, admission_date: e.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Add student"
                : "Save changes"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
