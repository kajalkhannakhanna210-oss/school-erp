"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/require-role";
import { recordAccessLog } from "@/lib/security/access-logs";
import { isValidIdentifier, normalizeIdentifier } from "@/lib/security/auth-inputs";
import { randomBytes } from "crypto";

type State = { error: string | null; message?: string; id?: string; adminIdentifier?: string; adminPassword?: string };

async function guard() { await requireSuperAdmin(); }

function values(form: FormData) {
  return { name: String(form.get("name") ?? "").trim(), code: String(form.get("code") ?? "").trim().toUpperCase(), loginIdentifier: String(form.get("login_identifier") ?? "").trim(), is_active: form.get("is_active") !== "false" };
}

export async function createOrganization(_state: State, form: FormData): Promise<State> {
  await guard();
  const input = values(form);
  if (!input.name || !input.code) return { error: "Organization name and code are required." };
  const identifier = normalizeIdentifier(input.loginIdentifier);
  if (!input.loginIdentifier || !isValidIdentifier(identifier)) return { error: "A valid email ID or mobile number is required for the default login." };
  const supabase = await createClient();
  const { loginIdentifier: _loginIdentifier, ...organizationInput } = input;
  const { data, error } = await supabase.from("organizations").insert(organizationInput).select("id").single();
  if (error) return { error: error.code === "23505" ? "Organization code already exists." : error.message };

  // Every new organization gets one organization-level administrator. Reuse
  // the existing Supabase Auth, profiles, and organization_memberships model.
  const admin = createAdminClient();
  const temporaryPassword = `Org@${randomBytes(9).toString("base64url")}`;
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    ...(identifier.kind === "phone" ? { phone: identifier.value } : { email: identifier.value }),
    password: temporaryPassword,
    email_confirm: true,
    phone_confirm: identifier.kind === "phone",
    user_metadata: { full_name: `${input.name} Admin`, role: "organization_admin" },
  });
  if (authError || !authUser.user) {
    await admin.from("organizations").delete().eq("id", data.id);
    return { error: authError?.message ?? "Organization was created, but its admin login could not be created." };
  }

  const { error: membershipError } = await admin.from("organization_memberships").insert({
    profile_id: authUser.user.id,
    organization_id: data.id,
    membership_role: "organization_admin",
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("organizations").delete().eq("id", data.id);
    return { error: membershipError.message };
  }

  revalidatePath("/organization-master");
  return { error: null, message: "Organization and default admin login created successfully.", id: data.id, adminIdentifier: identifier.displayValue, adminPassword: temporaryPassword };
}

export async function updateOrganization(id: string, _state: State, form: FormData): Promise<State> {
  await guard();
  const input = values(form);
  if (!id || !input.name || !input.code) return { error: "Organization name and code are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name: input.name, code: input.code, is_active: input.is_active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Organization code already exists." : error.message };
  revalidatePath("/organization-master"); revalidatePath(`/organization-master/${id}`);
  return { error: null, message: "Organization updated successfully." };
}

export async function toggleOrganization(id: string, isActive: boolean): Promise<void> {
  await guard();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (!error) { revalidatePath("/organization-master"); revalidatePath(`/organization-master/${id}`); }
}

export async function deactivateOrganization(id: string, _state: { error: string | null; message?: string }, form: FormData): Promise<{ error: string | null; message?: string }> {
  await guard();
  const reason = String(form.get("reason") ?? "").trim();
  if (!id || reason.length < 3) return { error: "A deactivation reason is required." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("organizations").update({ is_active: false, inactive_reason: reason, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  await supabase.from("organization_status_history").insert({ organization_id: id, status: "inactive", reason, created_by: user?.id ?? null });
  await recordAccessLog({ userId: user?.id, module: "Organization Master", page: "/organization-master", resource: id, requestMethod: "PATCH", action: `Deactivated organization: ${reason}`, statusCode: 200 });
  revalidatePath("/organization-master");
  revalidatePath(`/organization-master/${id}`);
  return { error: null, message: "Organization deactivated successfully." };
}

export async function activateOrganization(id: string, _state: { error: string | null; message?: string }, form: FormData): Promise<{ error: string | null; message?: string }> {
  await guard();
  const reason = String(form.get("reason") ?? "").trim();
  if (!id || reason.length < 3) return { error: "An activation reason is required." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("organizations").update({ is_active: true, inactive_reason: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  await supabase.from("organization_status_history").insert({ organization_id: id, status: "active", reason, created_by: user?.id ?? null });
  await recordAccessLog({ userId: user?.id, module: "Organization Master", page: "/organization-master", resource: id, requestMethod: "PATCH", action: `Activated organization: ${reason}`, statusCode: 200 });
  revalidatePath("/organization-master");
  revalidatePath(`/organization-master/${id}`);
  return { error: null, message: "Organization activated successfully." };
}

export async function deleteOrganization(id: string, _state: { error: string | null; message?: string }, form: FormData): Promise<{ error: string | null; message?: string }> {
  await guard();
  const reason = String(form.get("reason") ?? "").trim();
  if (!id || reason.length < 3) return { error: "A deletion reason is required." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) return { error: error.message };
  await recordAccessLog({ userId: user?.id, module: "Organization Master", page: "/organization-master", resource: id, requestMethod: "DELETE", action: `Deleted organization: ${reason}`, statusCode: 204 });
  revalidatePath("/organization-master");
  return { error: null, message: "Organization deleted successfully." };
}

export async function resetOrganizationAdminPassword(organizationId: string) {
  await guard();
  if (!organizationId) return { error: "Organization was not specified." };
  const admin = createAdminClient();
  const { data: membership, error: membershipError } = await admin.from("organization_memberships").select("profile_id").eq("organization_id", organizationId).eq("membership_role", "organization_admin").eq("is_active", true).limit(1).maybeSingle();
  if (membershipError || !membership?.profile_id) return { error: membershipError?.message ?? "Default admin login was not found." };
  const temporaryPassword = `Org@${randomBytes(9).toString("base64url")}`;
  const { error } = await admin.auth.admin.updateUserById(membership.profile_id, { password: temporaryPassword });
  if (error) return { error: error.message };
  return { error: null, temporaryPassword };
}
