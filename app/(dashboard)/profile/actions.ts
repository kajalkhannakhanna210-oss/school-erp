"use server";

import { validateNewPassword } from "@/lib/security/auth-inputs";
import { createClient } from "@/lib/supabase/server";
import { recordLoginActivity } from "@/lib/security/login-activity";
import { recordServerAction } from "@/lib/security/access-logs";

export async function updatePassword(newPassword: string) {
  const validationError = validateNewPassword(newPassword);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  const { data: { user } } = await supabase.auth.getUser();
  if (!error && user) {
    await recordLoginActivity({ eventType: "password_changed", status: "success", userId: user.id, authenticationMethod: "password" });
    await recordServerAction({
      action: "Change Password",
      module: "Profile",
      page: "User Profile",
      resource: "/profile",
      outcome: "Account password updated successfully",
      userId: user.id,
    });
  }
  return { error: error?.message ?? null };
}
