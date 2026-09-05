import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/require-role";
import { ModuleMasterClient } from "./module-master-client";

export const dynamic = "force-dynamic";
export default async function ModuleMasterPage() {
  try { await requireSuperAdmin(); } catch { redirect("/dashboard"); }
  const admin = createAdminClient();
  const [{ data: modules }, { data: organisations }, { data: assignments }, { data: pages }] = await Promise.all([
    admin.from("system_modules").select("id, module_code, module_name, description, display_order, is_active").order("display_order").order("module_name"),
    admin.from("organizations").select("id, name, code").eq("is_active", true).order("name"),
    admin.from("organisation_module_access").select("organisation_id, module_id, is_enabled"),
    admin.from("system_pages").select("module_id, page_code, page_name, route").eq("is_active", true),
  ]);
  return <ModuleMasterClient modules={modules ?? []} organisations={organisations ?? []} assignments={assignments ?? []} pages={pages ?? []} />;
}
