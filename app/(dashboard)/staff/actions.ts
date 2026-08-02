"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StaffInput = {
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

export async function createStaff(input: StaffInput) {
  await requireSuperAdmin();

  if (!input.full_name.trim() || !input.contact_email.trim() || !input.temporary_password || !input.joining_date) {
    return { error: "Name, email, temporary password, and joining date are required." };
  }
  if (input.temporary_password.length < 8) return { error: "Temporary password must be at least 8 characters." };
  const mobileDigits = input.mobile_number.replace(/\D/g, "");
  if (mobileDigits.length !== 10) return { error: "Enter a valid 10-digit mobile number." };
  if (input.salary && (Number.isNaN(Number(input.salary)) || Number(input.salary) < 0)) {
    return { error: "Salary must be a valid positive amount." };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.contact_email.trim(),
    password: input.temporary_password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: "staff" },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the staff member's account" };
  }

  const { error: insertError } = await admin.from("staff").insert({
    id: created.user.id,
    contact_email: input.contact_email,
    department: input.department || null,
    designation: input.designation || null,
    qualification: input.qualification || null,
    mobile_number: mobileDigits,
    salary: input.salary ? Number(input.salary) : null,
    joining_date: input.joining_date,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message };
  }

  revalidatePath("/staff");
  return { error: null, id: created.user.id };
}

function staffInputFromForm(formData: FormData): StaffInput {
  return {
    full_name: String(formData.get("full_name") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    temporary_password: String(formData.get("temporary_password") ?? ""),
    department: String(formData.get("department") ?? ""),
    designation: String(formData.get("designation") ?? ""),
    qualification: String(formData.get("qualification") ?? ""),
    mobile_number: String(formData.get("mobile_number") ?? ""),
    salary: String(formData.get("salary") ?? ""),
    joining_date: String(formData.get("joining_date") ?? ""),
  };
}

// Native form fallback: records still save when the client bundle is delayed
// or unavailable, rather than submitting a GET request to /staff/new?.
export async function createStaffFromForm(formData: FormData) {
  const result = await createStaff(staffInputFromForm(formData));
  if (result.error) redirect(`/staff/new?error=${encodeURIComponent(result.error)}`);
  redirect(`/staff/${result.id}?saved=created`);
}

type StaffUpdateInput = Partial<Omit<StaffInput, "contact_email" | "temporary_password">> & {
  full_name?: string;
  contact_email?: string;
};

export async function updateStaff(id: string, input: StaffUpdateInput) {
  await requireSuperAdmin();
  // Same guard as updateStudent: contact_email is only set at invite time
  // and isn't on the edit form, so it's dropped here rather than trusted
  // from the client.
  const { full_name, contact_email: _contactEmail, temporary_password: _temporaryPassword, salary, ...rest } = input as StaffUpdateInput & { temporary_password?: string };
  if (!id || !full_name?.trim() || !rest.joining_date) {
    return { error: "Name and joining date are required." };
  }
  if (salary && (Number.isNaN(Number(salary)) || Number(salary) < 0)) {
    return { error: "Salary must be a valid positive amount." };
  }
  const mobileDigits = (rest.mobile_number ?? "").replace(/\D/g, "");
  if (mobileDigits.length !== 10) return { error: "Enter a valid 10-digit mobile number." };
  const admin = createAdminClient();

  const [{ error: profileError }, { error: staffError }] = await Promise.all([
    full_name
      ? admin.from("profiles").update({ full_name: full_name.trim() }).eq("id", id)
      : Promise.resolve({ error: null }),
    admin
      .from("staff")
      .update({ ...rest, mobile_number: mobileDigits, salary: salary ? Number(salary) : null })
      .eq("id", id),
  ]);

  revalidatePath(`/staff/${id}`);
  revalidatePath("/staff");
  return { error: profileError?.message ?? staffError?.message ?? null };
}

export async function updateStaffFromForm(id: string, formData: FormData) {
  const { temporary_password: _temporaryPassword, contact_email: _contactEmail, ...input } = staffInputFromForm(formData);
  const result = await updateStaff(id, input);
  if (result.error) redirect(`/staff/${id}/edit?error=${encodeURIComponent(result.error)}`);
  redirect(`/staff/${id}?saved=updated`);
}

export async function setStaffActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
  return { error: error?.message ?? null };
}

export async function setStaffPhoto(id: string, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ photo_path: path }).eq("id", id);
  revalidatePath(`/staff/${id}`);
  return { error: error?.message ?? null };
}

export async function setStaffPermissions(staffId: string, permissionKeys: string[]) {
  const supabase = await createClient();

  // Simplest correct approach for a small, infrequently-changed permission
  // set: replace the whole assignment rather than diffing it.
  const { error: deleteError } = await supabase
    .from("staff_permissions")
    .delete()
    .eq("staff_id", staffId);

  if (deleteError) return { error: deleteError.message };

  if (permissionKeys.length > 0) {
    const { error: insertError } = await supabase
      .from("staff_permissions")
      .insert(permissionKeys.map((permission_key) => ({ staff_id: staffId, permission_key })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/staff/${staffId}`);
  return { error: null };
}
