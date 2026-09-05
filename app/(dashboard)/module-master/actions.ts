"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveModule(input: { id?: string; moduleCode: string; moduleName: string; description: string; displayOrder: number; isActive: boolean }) {
  await requireSuperAdmin();
  const moduleCode = input.moduleCode.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const moduleName = input.moduleName.trim();
  if (!moduleCode || !moduleName) return { error: "Module name and code are required." };
  const { error } = await createAdminClient().from("system_modules").upsert({ ...(input.id ? { id: input.id } : {}), module_code: moduleCode, module_name: moduleName, description: input.description.trim() || null, display_order: Number(input.displayOrder) || 0, is_active: input.isActive, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/module-master"); revalidatePath("/access/organisations"); revalidatePath("/access/staff"); revalidatePath("/dashboard");
  return { error: null };
}

export async function saveOrganisationModules(organisationId: string, enabledModuleIds: string[]) {
  const admin = createAdminClient();
  await requireSuperAdmin();
  const { data: modules } = await admin.from("system_modules").select("id").eq("is_active", true);
  const selected = new Set(enabledModuleIds);
  const { error } = await admin.from("organisation_module_access").upsert((modules ?? []).map((module) => ({ organisation_id: organisationId, module_id: module.id, is_enabled: selected.has(module.id), updated_at: new Date().toISOString() })), { onConflict: "organisation_id,module_id" });
  if (error) return { error: error.message };
  revalidatePath("/module-master"); revalidatePath("/access/organisations"); revalidatePath("/access/staff"); revalidatePath("/dashboard");
  return { error: null };
}
