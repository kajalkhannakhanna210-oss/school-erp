"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveRole(input: { id?: string; roleName: string; roleCode: string; roleScope: "ORGANISATION" | "SCHOOL"; description: string; isActive: boolean; permissionKeys: string[] }) {
  await requireSuperAdmin();
  const roleName = input.roleName.trim();
  const roleCode = input.roleCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!roleName || !roleCode) return { error: "Role name and role code are required." };
  const admin = createAdminClient();
  const { data: role, error } = await admin.from("staff_roles").upsert({
    ...(input.id ? { id: input.id } : {}), role_name: roleName, role_code: roleCode,
    role_scope: input.roleScope, description: input.description.trim() || null, is_active: input.isActive, updated_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !role) return { error: error?.message ?? "Could not save role." };
  const keys = [...new Set(input.permissionKeys)].filter(Boolean);
  const { error: deleteError } = await admin.from("role_permissions").delete().eq("role_id", role.id);
  if (deleteError) return { error: deleteError.message };
  if (keys.length) {
    const { error: permissionError } = await admin.from("role_permissions").insert(keys.map((permission_key) => ({ role_id: role.id, permission_key })));
    if (permissionError) return { error: permissionError.message };
  }
  revalidatePath("/role-master");
  revalidatePath("/role-access");
  revalidatePath("/dashboard");
  return { error: null };
}
