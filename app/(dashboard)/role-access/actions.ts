"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import type { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { navItems } from "../nav-config";

export async function updateRolePageAccess(role: UserRole, pageKeys: string[]) {
  await requireSuperAdmin();
  const allowedKeys = new Set(navItems.filter((item) => item.roles.includes(role)).map((item) => item.key));
  const uniqueKeys = [...new Set(pageKeys)].filter((key) => allowedKeys.has(key));
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("role_page_access").delete().eq("role", role);
  if (deleteError) return { error: deleteError.message };

  if (uniqueKeys.length) {
    const { error: insertError } = await supabase
      .from("role_page_access")
      .insert(uniqueKeys.map((page_key) => ({ role, page_key })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/role-access");
  return { error: null };
}
