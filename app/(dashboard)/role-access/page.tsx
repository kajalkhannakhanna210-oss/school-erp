import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleAccessForm } from "./role-access-form";

export default async function RoleAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  const { data: access } = await supabase.from("role_page_access").select("role, page_key");

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Role Page Access</h1>
      <p className="mt-1 text-sm text-slate/60">Choose which dashboard pages are shown in the sidebar for each role.</p>
      <RoleAccessForm initialAccess={(access ?? []) as { role: "super_admin" | "staff" | "student"; page_key: string }[]} />
    </div>
  );
}
