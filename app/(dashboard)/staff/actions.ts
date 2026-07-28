"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StaffInput = {
  full_name: string;
  contact_email: string;
  department: string;
  designation: string;
  qualification: string;
  mobile_number: string;
  salary: string;
  joining_date: string;
};

export async function createStaff(input: StaffInput) {
  await requireSuperAdmin();

  const admin = createAdminClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    input.contact_email,
    { data: { full_name: input.full_name, role: "staff" } }
  );

  if (inviteError || !invited.user) {
    return { error: inviteError?.message ?? "Could not create the staff member's account" };
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("staff").insert({
    id: invited.user.id,
    contact_email: input.contact_email,
    department: input.department || null,
    designation: input.designation || null,
    qualification: input.qualification || null,
    mobile_number: input.mobile_number || null,
    salary: input.salary ? Number(input.salary) : null,
    joining_date: input.joining_date,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return { error: insertError.message };
  }

  revalidatePath("/staff");
  redirect(`/staff/${invited.user.id}`);
}

type StaffUpdateInput = Partial<Omit<StaffInput, "contact_email">> & {
  full_name?: string;
  contact_email?: string;
};

export async function updateStaff(id: string, input: StaffUpdateInput) {
  // Same guard as updateStudent: contact_email is only set at invite time
  // and isn't on the edit form, so it's dropped here rather than trusted
  // from the client.
  const { full_name, contact_email: _contactEmail, salary, ...rest } = input;
  const supabase = await createClient();

  const [{ error: profileError }, { error: staffError }] = await Promise.all([
    full_name
      ? supabase.from("profiles").update({ full_name }).eq("id", id)
      : Promise.resolve({ error: null }),
    supabase
      .from("staff")
      .update({ ...rest, salary: salary ? Number(salary) : null })
      .eq("id", id),
  ]);

  revalidatePath(`/staff/${id}`);
  revalidatePath("/staff");
  return { error: profileError?.message ?? staffError?.message ?? null };
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
