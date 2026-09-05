import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { RoleAccessForm } from "./role-access-form";

export const dynamic = "force-dynamic";

export default async function RoleAccessPage() {
  let role = "";
  try {
    ({ role } = await requirePageAccess("role_access"));
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: access } = await supabase.from("role_page_access").select("role, page_key");
  const admin = role === "super_admin" ? createAdminClient() : supabase;
  const [{ data: organizations }, { data: schools }, { data: staff }, { data: roles }, { data: schoolScopes }] = await Promise.all([
    admin.from("organizations").select("id, name, code").eq("is_active", true).order("name"),
    admin.from("schools").select("id, name, code, organization_id").eq("is_active", true).order("name"),
    admin.from("staff").select("id, employee_id, organization_id, role_id, profiles(full_name)").eq("is_active", true).order("employee_id"),
    admin.from("staff_roles").select("id, role_code, role_name, role_scope").eq("is_active", true).order("role_name"),
    admin.from("staff_module_scopes").select("staff_id, scope_type, resource_id").eq("module_key", "school_access").eq("action_key", "ALL"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Role Page Access</h1>
      <p className="mt-1 text-sm text-slate/60">Choose which dashboard pages are shown in the sidebar for each role.</p>
      <RoleAccessForm
        initialAccess={(access ?? []) as { role: "super_admin" | "staff" | "student"; page_key: string }[]}
        organizations={(organizations ?? []) as { id: string; name: string; code: string }[]}
        schools={(schools ?? []) as { id: string; name: string; code: string; organization_id: string }[]}
        staff={(staff ?? []).map((member: any) => ({ id: member.id, employee_id: member.employee_id, organization_id: member.organization_id, role_id: member.role_id, full_name: member.profiles?.full_name ?? member.employee_id }))}
        initialSchoolScopes={(schoolScopes ?? []) as { staff_id: string; scope_type: string; resource_id: string | null }[]}
        roles={(roles ?? []) as { id: string; role_code: string; role_name: string; role_scope: string }[]}
      />
    </div>
  );
}
