"use server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function switchActiveRole(nextRole: string) {
  if (!(["super_admin", "staff", "student"] as string[]).includes(nextRole)) return { error: "Invalid role" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase.rpc("set_my_active_role", { next_role: nextRole as UserRole });
  return { error: error?.message ?? null };
}
