"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StudentInput = {
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

export async function createStudent(input: StudentInput) {
  await requireSuperAdmin();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email.trim())) return { error: "Enter a valid email address." };
  if (input.mobile_number && !/^[6-9]\d{9}$/.test(input.mobile_number.trim())) return { error: "Mobile number must be a valid 10-digit number starting with 6–9." };
  if (input.admission_number && !/^[A-Z0-9-]{3,30}$/.test(input.admission_number.trim().toUpperCase())) return { error: "Admission number may contain only letters, numbers, and hyphens." };

  if (input.temporary_password.length < 8) {
    return { error: "Temporary password must be at least 8 characters." };
  }

  const admin = createAdminClient();

  // Create the account directly rather than sending an invitation email.
  // Supabase hashes the temporary password; it is never written to our tables.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.contact_email,
    password: input.temporary_password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: "student" },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the student's account" };
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("students").insert({
    id: created.user.id,
    admission_number: input.admission_number.trim() ? input.admission_number.trim().toUpperCase() : null,
    contact_email: input.contact_email,
    roll_number: input.roll_number || null,
    father_name: input.father_name || null,
    mother_name: input.mother_name || null,
    gender: input.gender || null,
    date_of_birth: input.date_of_birth || null,
    blood_group: input.blood_group || null,
    address: input.address || null,
    mobile_number: input.mobile_number || null,
    class_id: input.class_id,
    section_id: input.section_id,
    session_id: input.session_id,
    admission_date: input.admission_date,
  });

  if (insertError) {
    // Don't leave an orphaned login with no student record behind it.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message };
  }

  revalidatePath("/students");
  return { error: null, id: created.user.id };
}

type StudentUpdateInput = Partial<Omit<StudentInput, "contact_email" | "temporary_password">> & {
  full_name?: string;
  contact_email?: string;
  temporary_password?: string;
};

export async function updateStudent(id: string, input: StudentUpdateInput) {
  // Login credentials are creation-only. Drop them from an edit payload so
  // they can never be written to the student record.
  const { full_name, contact_email: _contactEmail, temporary_password: _temporaryPassword, ...studentFields } = input;
  if (studentFields.mobile_number && !/^[6-9]\d{9}$/.test(studentFields.mobile_number.trim())) return { error: "Mobile number must be a valid 10-digit number starting with 6–9." };
  const supabase = await createClient();

  const [{ error: profileError }, { error: studentError }] = await Promise.all([
    full_name
      ? supabase.from("profiles").update({ full_name }).eq("id", id)
      : Promise.resolve({ error: null }),
    supabase.from("students").update(studentFields).eq("id", id),
  ]);

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  return { error: profileError?.message ?? studentError?.message ?? null };
}

export async function setStudentActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { error: error?.message ?? null };
}

export async function allotAdmissionNumber(studentId: string, admissionNumber: string, sectionId?: string) {
  await requireSuperAdmin();
  const value = admissionNumber.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(value)) return { error: "Admission number may contain only letters, numbers, and hyphens." };
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ admission_number: value, ...(sectionId ? { section_id: sectionId } : {}) }).eq("id", studentId);
  revalidatePath("/students"); revalidatePath(`/students/${studentId}`);
  return { error: error?.message ?? null };
}

export async function promoteStudents(input: {
  from_class_id: string;
  from_section_id: string;
  from_session_id: string;
  to_class_id: string;
  to_section_id: string;
  to_session_id: string;
}) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("students")
    .update(
      { class_id: input.to_class_id, section_id: input.to_section_id, session_id: input.to_session_id },
      { count: "exact" }
    )
    .eq("class_id", input.from_class_id)
    .eq("section_id", input.from_section_id)
    .eq("session_id", input.from_session_id)
    .eq("is_active", true);

  revalidatePath("/students");
  return { error: error?.message ?? null, count: count ?? 0 };
}

export async function bulkUpdateStudents(ids: string[], input: { class_id?: string; section_id?: string; session_id?: string }) {
  await requireSuperAdmin();
  if (!ids.length || !Object.keys(input).length) return { error: "Select students and at least one field to update.", count: 0 };
  const supabase = await createClient();
  const { error, count } = await supabase.from("students").update(input, { count: "exact" }).in("id", ids);
  revalidatePath("/students");
  return { error: error?.message ?? null, count: count ?? 0 };
}

export async function setStudentPhoto(id: string, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ photo_path: path }).eq("id", id);
  revalidatePath(`/students/${id}`);
  return { error: error?.message ?? null };
}

export async function addStudentDocument(studentId: string, filePath: string, fileName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_documents")
    .insert({ student_id: studentId, file_path: filePath, file_name: fileName });
  revalidatePath(`/students/${studentId}`);
  return { error: error?.message ?? null };
}

export async function removeStudentDocument(id: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("student_documents").delete().eq("id", id);
  revalidatePath(`/students/${studentId}`);
  return { error: error?.message ?? null };
}
