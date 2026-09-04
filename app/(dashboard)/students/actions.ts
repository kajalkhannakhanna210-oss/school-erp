"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";
import { getMasterDataContext } from "@/lib/security/master-data-context";

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

  let userId = created.user?.id;
  if (!userId && createError?.message.toLowerCase().includes("already been registered")) {
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = users.users.find((user) => user.email?.toLowerCase() === input.contact_email.trim().toLowerCase())?.id;
  }
  if (!userId) return { error: createError?.message ?? "Could not create the student's account" };

  const supabase = await createClient();
  let admissionNumber = input.admission_number.trim() ? input.admission_number.trim().toUpperCase() : null;
  if (!admissionNumber && input.class_id && input.session_id) {
    const context = await getMasterDataContext();
    const { data: classRow } = await supabase.from("classes").select("wing_id, organization_id, school_id").eq("id", input.class_id).maybeSingle();
    if (classRow?.wing_id && context.schoolId === classRow.school_id && context.organizationId === classRow.organization_id) {
      const { data: generated, error: generationError } = await supabase.rpc("generate_wing_admission_number", { p_organization_id: classRow.organization_id, p_school_id: classRow.school_id, p_wing_id: classRow.wing_id, p_academic_session_id: input.session_id });
      if (generationError) return { error: generationError.message };
      admissionNumber = generated;
    } else if (classRow?.wing_id) {
      return { error: "Select the correct school context before admitting this student." };
    }
  }
  const { error: insertError } = await supabase.from("students").insert({
    id: userId,
    admission_number: admissionNumber,
    contact_email: input.contact_email,
    roll_number: input.roll_number || null,
    father_name: input.father_name || null,
    mother_name: input.mother_name || null,
    gender: input.gender || null,
    date_of_birth: input.date_of_birth || null,
    blood_group: input.blood_group || null,
    address: input.address || null,
    mobile_number: input.mobile_number || null,
    class_id: input.class_id || null,
    section_id: input.section_id || null,
    session_id: input.session_id || null,
    admission_date: input.admission_date,
  });

  if (insertError) {
    // Don't leave an orphaned login with no student record behind it.
    if (!createError) await admin.auth.admin.deleteUser(userId);
    return { error: insertError.message };
  }

  await recordServerAction({
    action: "Create Student",
    module: "Students",
    page: "Add Student Form",
    resource: "/students/new",
    statusCode: 201,
    outcome: `Created student ${input.full_name} (${input.contact_email})`,
  });

  revalidatePath("/students");
  return { error: null, id: userId };
}

type StudentUpdateInput = Partial<Omit<StudentInput, "contact_email" | "temporary_password">> & {
  full_name?: string;
  contact_email?: string;
  temporary_password?: string;
};

export async function updateStudent(id: string, input: StudentUpdateInput) {
  const supabase = await createClient();
  // Login credentials are creation-only. Drop them from an edit payload so
  // they can never be written to the student record.
  const { full_name, contact_email: _contactEmail, temporary_password: _temporaryPassword, ...studentFields } = input;
  const normalizedStudentFields = {
    ...studentFields,
    class_id: studentFields.class_id || null,
    section_id: studentFields.section_id || null,
    session_id: studentFields.session_id || null,
  };
  if (studentFields.mobile_number && !/^[6-9]\d{9}$/.test(studentFields.mobile_number.trim())) return { error: "Mobile number must be a valid 10-digit number starting with 6–9." };
  if (studentFields.admission_number?.trim()) {
    const { data: duplicate } = await supabase.from("students").select("id").eq("admission_number", studentFields.admission_number.trim()).neq("id", id).maybeSingle();
    if (duplicate) return { error: "This admission number is already assigned to another student." };
  }
  const [{ error: profileError }, { error: studentError }] = await Promise.all([
    full_name
      ? supabase.from("profiles").update({ full_name }).eq("id", id)
      : Promise.resolve({ error: null }),
    supabase.from("students").update(normalizedStudentFields).eq("id", id),
  ]);

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  await recordServerAction({
    action: "Update Student",
    module: "Students",
    page: "Student Profile",
    resource: `/students/${id}`,
    outcome: `Updated student record for ${full_name || id}`,
  });
  return { error: profileError?.message ?? studentError?.message ?? null };
}

export async function archiveStudent(id: string, archiveDate: string, remark: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  // Update student status and record archive metadata on the students row
  let { error: updateError } = await supabase
    .from("students")
    .update({ is_active: false, inactive_date: archiveDate, inactive_reason: remark || null, inactive_by: user.id })
    .eq("id", id);
  if (updateError) {
    // Fallback: update is_active alone if archival metadata columns are missing
    const fallback = await supabase.from("students").update({ is_active: false }).eq("id", id);
    if (fallback.error) return { error: fallback.error.message };
  }

  // Record archival in audit table (optional)
  try {
    await supabase.from("student_archive_audit").insert({
      student_id: id,
      action: "archived",
      archive_date: archiveDate,
      remark: remark || null,
      created_by: user.id,
    });
  } catch (_e) {
    // Ignore audit table error if table does not exist
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  
  await recordServerAction({
    action: "Archive Student",
    module: "Students",
    page: "Student Profile",
    resource: `/students/${id}`,
    outcome: `Archived student ${id} with archive date: ${archiveDate}. Remark: ${remark}`,
  });

  return { error: null };
}

export async function restoreStudent(id: string, remark?: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  // Update student status and clear archive metadata on the students row
  let { error: updateError } = await supabase
    .from("students")
    .update({ is_active: true, inactive_date: null, inactive_reason: null, inactive_by: null })
    .eq("id", id);
  if (updateError) {
    // Fallback: update is_active alone if archival metadata columns are missing
    const fallback = await supabase.from("students").update({ is_active: true }).eq("id", id);
    if (fallback.error) return { error: fallback.error.message };
  }

  // Record restoration in audit table
  try {
    await supabase.from("student_archive_audit").insert({
      student_id: id,
      action: "restored",
      archive_date: new Date().toISOString().split("T")[0],
      remark: remark || "Student restored",
      created_by: user.id,
    });
  } catch (_e) {
    // Ignore audit table error if table does not exist
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);

  await recordServerAction({
    action: "Restore Student",
    module: "Students",
    page: "Student Directory",
    resource: `/students/${id}`,
    outcome: `Restored student ${id}`,
  });

  return { error: null };
}

export async function setStudentActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  await recordServerAction({
    action: isActive ? "Activate Student" : "Deactivate Student",
    module: "Students",
    page: "Student Directory",
    resource: `/students/${id}`,
    outcome: `Student ${id} set to ${isActive ? "Active" : "Inactive"}`,
  });
  return { error: error?.message ?? null };
}

export async function deleteAllStudentRecords() {
  const supabase = await createClient();
  const { data: students, error: fetchError } = await supabase.from("students").select("id");
  if (fetchError) return { error: `Student records could not be read: ${fetchError.message}`, count: 0 };
  const ids = (students ?? []).map((student) => student.id);
  if (!ids.length) return { error: null, count: 0 };
  const { error, count: deletedCount } = await supabase.from("students").delete({ count: "exact" }).in("id", ids);
  revalidatePath("/students");
  if (error) return { error: `Student records could not be removed: ${error.message}`, count: 0 };
  if (!deletedCount) return { error: "No student records were removed. Your account may not have permission to delete student data.", count: 0 };
  
  await recordServerAction({
    action: "Delete All Students",
    module: "Students",
    page: "Student Directory",
    resource: "/students",
    requestMethod: "DELETE",
    outcome: `Deleted ${deletedCount} student records`,
  });

  return { error: null, count: deletedCount };
}

export async function allotAdmissionNumber(studentId: string, admissionNumber: string, sectionId?: string) {
  await requireSuperAdmin();
  if (!sectionId?.trim()) {
    return { error: "Please select a section before saving." };
  }
  const value = admissionNumber.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(value)) return { error: "Admission number may contain only letters, numbers, and hyphens." };
  const supabase = await createClient();

  const { data: duplicate } = await supabase
    .from("students")
    .select("id")
    .eq("admission_number", value)
    .neq("id", studentId)
    .maybeSingle();

  if (duplicate) {
    return { error: `Admission number '${value}' is already assigned to another student.` };
  }

  const { error } = await supabase.from("students").update({ admission_number: value, section_id: sectionId }).eq("id", studentId);

  if (error) {
    if (error.code === "23505" || error.message.includes("unique constraint") || error.message.includes("students_admission_number_key")) {
      return { error: `Admission number '${value}' is already assigned to another student.` };
    }
    return { error: error.message };
  }

  revalidatePath("/students"); revalidatePath("/students/admission-allotment"); revalidatePath(`/students/${studentId}`);
  
  await recordServerAction({
    action: "Allot Admission Number",
    module: "Students",
    page: "Admission Allotment",
    resource: "/students/admission-allotment",
    outcome: `Allotted admission number ${value} to student ${studentId}`,
  });

  return { error: null };
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
  const { data: students, error: selectError } = await supabase.from("students").select("id").eq("class_id", input.from_class_id).eq("section_id", input.from_section_id).eq("session_id", input.from_session_id).eq("is_active", true);
  if (selectError) return { error: selectError.message, count: 0 };
  const { error, count } = await supabase.from("student_enrollments").upsert(
    (students ?? []).map((student) => ({ student_id: student.id, session_id: input.to_session_id, class_id: input.to_class_id, section_id: input.to_section_id })),
    { onConflict: "student_id,session_id", count: "exact" }
  );

  await recordServerAction({
    action: "Promote Students",
    module: "Students",
    page: "Student Directory",
    resource: "/students",
    outcome: `Promoted ${count ?? 0} students to new academic session`,
  });

  revalidatePath("/students");
  return { error: error?.message ?? null, count: count ?? 0 };
}

export async function bulkUpdateStudents(ids: string[], input: { class_id?: string; section_id?: string; session_id?: string }) {
  await requireSuperAdmin();
  if (!ids.length || !Object.keys(input).length) return { error: "Select students and at least one field to update.", count: 0 };
  const supabase = await createClient();
  const { error, count } = await supabase.from("students").update(input, { count: "exact" }).in("id", ids);
  
  await recordServerAction({
    action: "Bulk Update Students",
    module: "Students",
    page: "Student Directory",
    resource: "/students",
    outcome: `Bulk updated ${count ?? 0} student records`,
  });

  revalidatePath("/students");
  return { error: error?.message ?? null, count: count ?? 0 };
}

export async function setStudentPhoto(id: string, path: string) {
  if (!path.startsWith(`${id}/`)) return { error: "Invalid photo path." };
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ photo_path: path }).eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Upload Student Photo",
      module: "Students",
      page: "Student Profile",
      resource: `/students/${id}`,
      outcome: `Updated profile photo for student ${id}`,
    });
  }
  revalidatePath(`/students/${id}`);
  return { error: error?.message ?? null };
}
