import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/security/authorization";
import { StaffAccessClient } from "./staff-access-client";

export const dynamic = "force-dynamic";
export default async function StaffPageAccessPage() {
  const current = await getCurrentUser();
  if (!current || (current.userType !== "SUPER_ADMIN" && !current.permissions.includes("settings.manage") && !current.permissions.includes("staff_page_access.manage"))) redirect("/dashboard");
  const admin = createAdminClient(); const orgId = current.userType === "SUPER_ADMIN" ? null : current.profile.organization_id;
  const [{ data: organisations }, { data: pages }, { data: roles }, { data: staff }, { data: schools }, { data: orgPages }, { data: rolePages }, { data: staffPages }] = await Promise.all([
    admin.from("organizations").select("id, name, code").eq("is_active", true).order("name"),
    admin.from("system_pages").select("id, module_code, module_name, page_code, page_name, route, display_order").eq("is_active", true).order("display_order"),
    admin.from("staff_roles").select("id, role_name, role_scope").eq("is_active", true).order("role_name"),
    admin.from("staff").select("id, employee_id, organization_id, primary_school_id, role_id, profiles!staff_id_fkey(full_name, user_type, school_id)").eq("is_active", true).order("employee_id"),
    admin.from("schools").select("id, name, code, organization_id").eq("is_active", true).order("name"),
    admin.from("organisation_page_access").select("organisation_id, page_id").eq("is_enabled", true),
    admin.from("role_page_assignments").select("organisation_id, role_id, page_id").eq("is_enabled", true),
    admin.from("staff_page_access").select("organisation_id, school_id, staff_user_id, page_id").eq("is_enabled", true),
  ]);
  const filtered = orgId ? (staff ?? []).filter((s: any) => s.organization_id === orgId) : staff ?? [];
  return <StaffAccessClient initialOrganisationId={orgId ?? organisations?.[0]?.id ?? ""} organisations={organisations ?? []} pages={pages ?? []} roles={roles ?? []} staff={filtered.map((s: any) => ({ id: s.id, employee_id: s.employee_id, organization_id: s.organization_id, primary_school_id: s.primary_school_id, role_id: s.role_id, full_name: s.profiles?.full_name ?? s.employee_id, user_type: s.profiles?.user_type ?? null, school_id: s.profiles?.school_id ?? null }))} schools={schools ?? []} organisationPages={orgPages ?? []} rolePages={rolePages ?? []} staffPages={staffPages ?? []} isSuperAdmin={current.userType === "SUPER_ADMIN"} />;
}
