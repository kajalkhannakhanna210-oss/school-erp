import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/require-role";
import { OrganisationAccessClient } from "./organisation-access-client";

export const dynamic = "force-dynamic";
export default async function OrganisationPageAccessPage() {
  try { await requireSuperAdmin(); } catch { redirect("/dashboard"); }
  const admin = createAdminClient();
  const [{ data: organisations }, { data: pages }, { data: assignments }] = await Promise.all([
    admin.from("organizations").select("id, name, code").eq("is_active", true).order("name"),
    admin.from("system_pages").select("id, module_code, module_name, page_code, page_name, route, display_order").eq("is_active", true).order("display_order"),
    admin.from("organisation_page_access").select("organisation_id, page_id, is_enabled"),
  ]);
  return <OrganisationAccessClient organisations={organisations ?? []} pages={pages ?? []} assignments={assignments ?? []} />;
}
