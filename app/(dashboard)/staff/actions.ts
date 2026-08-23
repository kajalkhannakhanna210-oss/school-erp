"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { sanitizeStorageFileName, validateImageUpload } from "@/lib/security/uploads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

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
  photo_file?: File | null;
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

  const photoValidationError = input.photo_file?.size ? validateImageUpload(input.photo_file) : null;
  if (photoValidationError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: photoValidationError };
  }

  const photoPath = input.photo_file?.size ? `${created.user.id}/${Date.now()}-${sanitizeStorageFileName(input.photo_file.name)}` : null;
  const [photoResult, insertResult] = await Promise.all([
    photoPath && input.photo_file
      ? admin.storage.from("staff-photos").upload(photoPath, input.photo_file, { upsert: true })
      : Promise.resolve({ error: null }),
    admin.from("staff").insert({
      id: created.user.id,
      contact_email: input.contact_email,
      department: input.department || null,
      designation: input.designation || null,
      qualification: input.qualification || null,
      mobile_number: mobileDigits,
      salary: input.salary ? Number(input.salary) : null,
      joining_date: input.joining_date,
      photo_path: photoPath,
    }),
  ]);
  const photoError = photoResult.error;
  const insertError = insertResult.error;

  if (photoError || insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: photoError?.message ?? insertError?.message ?? "Could not save staff member." };
  }

  await recordServerAction({
    action: "Create Staff",
    module: "Staff",
    page: "Staff Directory",
    resource: "/staff/new",
    statusCode: 201,
    outcome: `Created staff member ${input.full_name} (${input.contact_email})`,
  });

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
    photo_file: formData.get("photo_file") instanceof File ? formData.get("photo_file") as File : null,
  };
}

// Native form fallback: records still save when the client bundle is delayed
// or unavailable, rather than submitting a GET request to /staff/new?.
export async function createStaffFromForm(_previousState: unknown, formData: FormData) {
  try {
    const input = staffInputFromForm(formData);
    const photo = formData.get("photo_file");
    const result = await createStaff({ ...input, photo_file: photo instanceof File ? photo : null });
    return result.error ? result : { ...result, message: "Staff member saved successfully." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save staff member." };
  }
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
  const { full_name, contact_email: _contactEmail, temporary_password: _temporaryPassword, photo_file, salary, ...rest } = input as StaffUpdateInput & { temporary_password?: string; photo_file?: File | null };
  if (!id || !full_name?.trim() || !rest.joining_date) {
    return { error: "Name and joining date are required." };
  }
  if (salary && (Number.isNaN(Number(salary)) || Number(salary) < 0)) {
    return { error: "Salary must be a valid positive amount." };
  }
  const mobileDigits = (rest.mobile_number ?? "").replace(/\D/g, "");
  if (mobileDigits.length !== 10) return { error: "Enter a valid 10-digit mobile number." };
  const admin = createAdminClient();
  let photoPath: string | undefined;
  if (photo_file?.size) {
    const photoValidationError = validateImageUpload(photo_file);
    if (photoValidationError) return { error: photoValidationError };
    photoPath = `${id}/${Date.now()}-${sanitizeStorageFileName(photo_file.name)}`;
    const { error } = await admin.storage.from("staff-photos").upload(photoPath, photo_file, { upsert: true });
    if (error) return { error: error.message };
  }

  const [{ error: profileError }, { error: staffError }] = await Promise.all([
    full_name
      ? admin.from("profiles").update({ full_name: full_name.trim() }).eq("id", id)
      : Promise.resolve({ error: null }),
    admin
      .from("staff")
      .update({ ...rest, mobile_number: mobileDigits, salary: salary ? Number(salary) : null, ...(photoPath ? { photo_path: photoPath } : {}) })
      .eq("id", id),
  ]);

  await recordServerAction({
    action: "Update Staff",
    module: "Staff",
    page: "Staff Profile",
    resource: `/staff/${id}`,
    outcome: `Updated staff profile for ${full_name || id}`,
  });

  revalidatePath(`/staff/${id}`);
  revalidatePath(`/staff/${id}/edit`);
  revalidatePath("/staff");
  return { error: profileError?.message ?? staffError?.message ?? null };
}

export async function updateStaffFromForm(id: string, _previousState: unknown, formData: FormData) {
  const { temporary_password: _temporaryPassword, contact_email: _contactEmail, ...input } = staffInputFromForm(formData);
  const photo = formData.get("photo_file");
  const result = await updateStaff(id, {
    ...input,
    photo_file: photo instanceof File && photo.size > 0 ? photo : null,
  });
  return result.error ? result : { ...result, message: "Staff member updated successfully." };
}

export async function setStaffActive(id: string, isActive: boolean) {
  const user = await requireSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("staff").update({
    is_active: isActive,
    inactive_date: isActive ? null : new Date().toISOString(),
    inactive_by: isActive ? null : user?.id ?? null,
  }).eq("id", id);

  await recordServerAction({
    action: isActive ? "Activate Staff" : "Deactivate Staff",
    module: "Staff",
    page: "Staff Directory",
    resource: `/staff/${id}`,
    outcome: `Staff member ${id} set to ${isActive ? "Active" : "Inactive"}`,
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
  return { error: error?.message ?? null };
}

export async function setStaffPhoto(id: string, path: string) {
  if (!path.startsWith(`${id}/`)) return { error: "Invalid photo path." };
  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ photo_path: path }).eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Upload Staff Photo",
      module: "Staff",
      page: "Staff Profile",
      resource: `/staff/${id}`,
      outcome: `Updated profile photo for staff member ${id}`,
    });
  }
  revalidatePath(`/staff/${id}`);
  return { error: error?.message ?? null };
}

export async function setStaffPermissions(staffId: string, permissionKeys: string[]) {
  const supabase = await createClient();

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

  await recordServerAction({
    action: "Update Staff Permissions",
    module: "Staff",
    page: "Staff Permissions",
    resource: `/staff/${staffId}`,
    outcome: `Updated permissions for staff ${staffId} (${permissionKeys.length} permissions assigned)`,
  });

  revalidatePath(`/staff/${staffId}`);
  return { error: null };
}

import { userHasPermission } from "@/lib/enquiries";

export async function setStaffModuleScopes(staffId: string, all: boolean, classIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isSuper = profile?.role === "super_admin";
  const canManage = await userHasPermission(supabase, user.id, "admission_enquiry.manage_configuration");
  if (!isSuper && !canManage) return { error: "You are not authorized to manage admission scopes" };

  const admin = createAdminClient();
  // Clean existing admission_enquiry scopes
  const { error: delErr } = await admin.from("staff_module_scopes").delete().eq("staff_id", staffId).eq("module_key", "admission_enquiry");
  if (delErr) return { error: delErr.message };

  if (all) {
    const { error: insertErr } = await admin.from("staff_module_scopes").insert([{ staff_id: staffId, module_key: "admission_enquiry", scope_type: "ALL", resource_id: null }]);
    if (insertErr) return { error: insertErr.message };
  } else if (classIds && classIds.length > 0) {
    const rows = classIds.map((c) => ({ staff_id: staffId, module_key: "admission_enquiry", scope_type: "CLASS", resource_id: c }));
    const { error: insertErr } = await admin.from("staff_module_scopes").insert(rows);
    if (insertErr) return { error: insertErr.message };
  }

  await recordServerAction({
    action: "Update Staff Admission Scopes",
    module: "Admission Enquiry",
    page: "Staff Profile",
    resource: `/staff/${staffId}`,
    outcome: `${user?.id} updated admission scopes for staff ${staffId}`,
    statusCode: 200,
  });

  revalidatePath(`/staff/${staffId}`);
  return { error: null };
}

