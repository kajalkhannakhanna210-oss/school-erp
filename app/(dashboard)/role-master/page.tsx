import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/require-role";
import { RoleMasterClient } from "./role-master-client";

export const dynamic = "force-dynamic";

export default async function RoleMasterPage() {
  try { await requireSuperAdmin(); } catch { redirect("/dashboard"); }
  const admin = createAdminClient();
  const [{ data: roles }, { data: permissions }, { data: mappings }] = await Promise.all([
    admin.from("staff_roles").select("id, role_code, role_name, role_scope, description, is_active").order("role_name"),
    admin.from("permissions").select("key, label").order("key"),
    admin.from("role_permissions").select("role_id, permission_key"),
  ]);
  return <RoleMasterClient roles={roles ?? []} permissions={permissions ?? []} mappings={mappings ?? []} />;
}
