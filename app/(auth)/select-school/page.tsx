import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SelectSchoolForm } from "./select-school-form";

export const dynamic = "force-dynamic";

export default async function SelectSchoolPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, user_type, organization_id, school_id").eq("id", auth.user.id).maybeSingle();
  if (!profile?.role) redirect("/login");
  if (profile.user_type === "SCHOOL_USER" && profile.organization_id && profile.school_id) redirect("/dashboard");
  const [{ data: staff }, { data: memberships }, { data: scopes }] = await Promise.all([
    admin.from("staff").select("organization_id").eq("id", auth.user.id).maybeSingle(),
    admin.from("organization_memberships").select("organization_id, school_id").eq("profile_id", auth.user.id).eq("is_active", true),
    admin.from("staff_module_scopes").select("scope_type, resource_id").eq("staff_id", auth.user.id).eq("module_key", "school_access").eq("action_key", "ALL"),
  ]);
  const organizationIds = profile.role === "super_admin" ? undefined : [...new Set([staff?.organization_id, ...(memberships ?? []).map((m) => m.organization_id)].filter(Boolean))] as string[];
  const { data: organizations } = await (organizationIds ? admin.from("organizations").select("id, name, code").in("id", organizationIds).eq("is_active", true) : admin.from("organizations").select("id, name, code").eq("is_active", true)).order("name");
  const allSchools = profile.role === "super_admin" || (memberships ?? []).some((m) => m.school_id === null) || (scopes ?? []).some((s) => s.scope_type === "ALL");
  const allowedSchoolIds = new Set([...(memberships ?? []).map((m) => m.school_id), ...(scopes ?? []).filter((s) => s.scope_type === "SCHOOL").map((s) => s.resource_id)].filter(Boolean));
  const { data: schools } = await (organizationIds ? admin.from("schools").select("id, name, code, organization_id").in("organization_id", organizationIds).eq("is_active", true) : admin.from("schools").select("id, name, code, organization_id").eq("is_active", true)).order("name");
  const visibleSchools = allSchools ? schools ?? [] : (schools ?? []).filter((school) => allowedSchoolIds.has(school.id));
  return <main className="mx-auto flex min-h-screen max-w-xl items-center bg-slate-50 px-4 py-8"><section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">School ERP</p><h1 className="mt-2 text-2xl font-bold text-slate-950">Choose your school</h1><p className="mt-2 text-sm text-slate-500">Select an authorized school to continue.</p><SelectSchoolForm organizations={organizations ?? []} schools={visibleSchools} /></section></main>;
}
