"use server";

import { validateNewPassword } from "@/lib/security/auth-inputs";
import { createClient } from "@/lib/supabase/server";
import { recordLoginActivity } from "@/lib/security/login-activity";

export async function updatePassword(newPassword: string) {
  const validationError = validateNewPassword(newPassword);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  const { data: { user } } = await supabase.auth.getUser();
  if (!error && user) await recordLoginActivity({ eventType: "password_changed", status: "success", userId: user.id, authenticationMethod: "password" });
  return { error: error?.message ?? null };
}
