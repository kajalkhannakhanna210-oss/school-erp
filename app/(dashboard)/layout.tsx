import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { navItems } from "./nav-config";
import { RoleSwitcher } from "./role-switcher";
import { DashboardMobileNavigation } from "./mobile-navigation";
import { DashboardSidebar } from "./dashboard-sidebar";
import { SessionSelector } from "./students/session-selector";
import { getSelectedSessionCookie } from "./session-actions";
import type { Metadata } from "next";
import { EnquiryLiveAlerts } from "@/components/enquiry-live-alerts";
import { FeedbackModal } from "@/components/feedback-modal";
import { getLoginContext } from "@/lib/security/login-context";
import { getMasterDataContext } from "@/lib/security/master-data-context";

export const metadata: Metadata = {
  title: "School administration dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const selectedSessionId = await getSelectedSessionCookie();
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
  const loginContext = await getLoginContext();
  const profileType = (profile as Profile & { user_type?: string; organization_id?: string | null; school_id?: string | null }).user_type
    ?? (profile.role === "super_admin" ? "SUPER_ADMIN" : (profile as any).school_id ? "SCHOOL_USER" : (profile as any).organization_id ? "ORGANISATION_USER" : null);
  if (profileType === "ORGANISATION_USER" && (!loginContext || loginContext.loginScope !== "organization")) redirect("/organisation");
  if (profileType === "SCHOOL_USER" && (!loginContext || loginContext.loginScope !== "school")) redirect("/select-school");
  if (!loginContext && profile.role !== "super_admin") {
    const { data: staffContext } = await supabase.from("staff").select("organization_id, primary_school_id").eq("id", user.id).maybeSingle();
    if (staffContext?.organization_id && staffContext.primary_school_id) redirect("/select-school");
  }

  const [{ data: rolePageAccess }, { data: roleMemberships }, { data: sessions }, masterDataContext] = await Promise.all([
    supabase
      .from("role_page_access")
      .select("page_key, icon")
      .eq("role", profile.role),
    supabase.from("profile_roles").select("role").eq("profile_id", user.id),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    getMasterDataContext(),
  ]);

  const allowedPageKeys = rolePageAccess ? new Set(rolePageAccess.map((access) => access.page_key)) : null;
  const icons = new Map((rolePageAccess ?? []).map((access) => [access.page_key, access.icon ?? "•"]));
  const visibleNav = navItems.filter((item) => {
    if (allowedPageKeys) {
      return allowedPageKeys.has(item.key);
    }
    return item.roles.includes(profile.role);
  }).map((item) => {
    const databaseIcon = icons.get(item.key);
    return {
      ...item,
      icon: databaseIcon && databaseIcon !== "•" ? databaseIcon : item.icon,
    };
  });

  const used = new Set<string>();
  const sections: { section: { key: string; label: string; keys: string[] }; items: typeof visibleNav }[] = [];
  for (const s of (await import("./nav-config")).navSections) {
    const items = visibleNav.filter((i) => s.keys.includes(i.key));
    items.forEach((it) => used.add(it.key));
    if (items.length) sections.push({ section: s, items });
  }
  const others = visibleNav.filter((i) => !used.has(i.key));
  if (others.length) sections.push({ section: { key: "other", label: "Other", keys: [] }, items: others });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <EnquiryLiveAlerts />
      <FeedbackModal />
      <DashboardSidebar sections={sections} profile={profile} />
      <div className="min-w-0">
        <div className="sticky top-0 z-40 min-h-16 lg:hidden" style={{ backgroundColor: "#222F57" }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-white"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold text-xs font-bold text-ink-900">R</div><span className="truncate font-display font-bold">Registrar</span></div>
            <div className="ml-auto flex items-center gap-2"><SessionSelector sessions={sessions ?? []} initialSessionId={selectedSessionId} className="text-white" /><DashboardMobileNavigation items={visibleNav} sections={sections} /></div>
          </div>
        </div>
        <header className="relative z-0 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/80 bg-white px-4 py-3 pb-3 shadow-sm sm:px-5 sm:py-4 sm:pb-4 lg:z-50 lg:px-8">
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
            <SessionSelector sessions={sessions ?? []} initialSessionId={selectedSessionId} className="hidden sm:flex" />
            {loginContext && <span className="hidden max-w-52 truncate rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-700 lg:inline">{loginContext.schoolId ? "School context active" : "Organization context"}</span>}
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)] min-w-0 overflow-x-hidden bg-cover bg-fixed bg-center p-4 sm:p-5 lg:p-8" style={{ backgroundImage: "linear-gradient(135deg, rgba(248,249,253,.96), rgba(243,245,250,.9)), url('/about-school.jpg')" }}>{children}</main>
      </div>
    </div>
  );
}
