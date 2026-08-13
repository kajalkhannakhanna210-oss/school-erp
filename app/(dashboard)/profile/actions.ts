"use server";

import { validateNewPassword } from "@/lib/security/auth-inputs";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(newPassword: string) {
  const validationError = validateNewPassword(newPassword);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}
