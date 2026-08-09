import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { navItems } from "./nav-config";
import { SignOutButton } from "./sign-out-button";
import { RoleSwitcher } from "./role-switcher";
import { DashboardMobileNavigation } from "./mobile-navigation";
import { DashboardSidebar } from "./dashboard-sidebar";
import { SessionSelector } from "./students/session-selector";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School administration dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  const [{ data: rolePageAccess }, { data: roleMemberships }, { data: sessions }] = await Promise.all([
    supabase
    .from("role_page_access")
    .select("page_key, icon")
    .eq("role", profile.role),
    supabase.from("profile_roles").select("role").eq("profile_id", user.id),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);
  const allowedPageKeys = rolePageAccess ? new Set(rolePageAccess.map((access) => access.page_key)) : null;
  const icons = new Map((rolePageAccess ?? []).map((access) => [access.page_key, access.icon ?? "•"]));
  const visibleNav = navItems.filter(
    (item) => item.roles.includes(profile.role) && (!allowedPageKeys || allowedPageKeys.has(item.key))
  ).map((item) => ({ ...item, icon: icons.get(item.key) ?? "•" }));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <DashboardSidebar items={visibleNav} />
      <div className="min-w-0">
        <div className="sticky top-0 z-40 lg:hidden" style={{ backgroundColor: "#222F57" }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-white"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold text-xs font-bold text-ink-900">R</div><span className="truncate font-display font-bold">Registrar</span></div>
            <DashboardMobileNavigation items={visibleNav} />
          </div>
        </div>
        <header className="relative z-0 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/80 bg-white px-4 py-3 pb-20 shadow-sm sm:px-5 sm:py-4 sm:pb-4 lg:z-50 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">
              {profile.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate/60">Signed in as</p>
              <p className="font-semibold text-ink-700">{profile.full_name}</p>
            </div>
          </div>
          <div className="absolute right-4 top-3 flex flex-col items-end justify-center gap-2 sm:static sm:flex-row sm:items-center sm:gap-3">
            <RoleSwitcher role={profile.role} roles={(roleMemberships ?? []).map((item) => item.role)} />
            <SessionSelector sessions={sessions ?? []} />
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)] min-w-0 overflow-x-hidden bg-cover bg-fixed bg-center p-4 sm:p-5 lg:p-8" style={{ backgroundImage: "linear-gradient(135deg, rgba(248,249,253,.96), rgba(243,245,250,.9)), url('/about-school.jpg')" }}>{children}</main>
      </div>
    </div>
  );
}
