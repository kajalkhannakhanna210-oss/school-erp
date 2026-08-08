import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { navItems } from "./nav-config";
import { SignOutButton } from "./sign-out-button";
import { RoleSwitcher } from "./role-switcher";
import { UserPreferences } from "@/components/user-preferences";
import { DashboardMobileNavigation } from "./mobile-navigation";

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

  const [{ data: rolePageAccess }, { data: roleMemberships }] = await Promise.all([
    supabase
    .from("role_page_access")
    .select("page_key")
    .eq("role", profile.role),
    supabase.from("profile_roles").select("role").eq("profile_id", user.id),
  ]);
  const allowedPageKeys = rolePageAccess ? new Set(rolePageAccess.map((access) => access.page_key)) : null;
  const visibleNav = navItems.filter(
    (item) => item.roles.includes(profile.role) && (!allowedPageKeys || allowedPageKeys.has(item.key))
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-ink-900 p-6 lg:block" style={{ backgroundColor: "#222F57" }}>
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold text-sm font-bold text-ink-900">R</div>
          <div><div className="font-display text-lg font-bold tracking-tight text-white">Registrar</div><p className="text-xs text-white/60">School Management</p></div>
        </div>
        <nav className="mt-9 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="sticky top-0 z-40 lg:hidden" style={{ backgroundColor: "#222F57" }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-white"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold text-xs font-bold text-ink-900">R</div><span className="truncate font-display font-bold">Registrar</span></div>
            <DashboardMobileNavigation items={visibleNav} />
          </div>
        </div>
        <header className="relative z-0 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/80 bg-white px-4 py-3 sm:px-5 sm:py-4 lg:z-50 lg:px-8">
          <div>
            <p className="text-sm text-slate/60">Signed in as</p>
            <p className="font-medium text-ink-700">{profile.full_name}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-3">
            <UserPreferences />
            <RoleSwitcher role={profile.role} roles={(roleMemberships ?? []).map((item) => item.role)} />
            <SignOutButton />
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)] min-w-0 overflow-x-hidden bg-cover bg-fixed bg-center p-4 sm:p-5 lg:p-8" style={{ backgroundImage: "linear-gradient(135deg, rgba(248,249,253,.96), rgba(243,245,250,.9)), url('/about-school.jpg')" }}>{children}</main>
      </div>
    </div>
  );
}
