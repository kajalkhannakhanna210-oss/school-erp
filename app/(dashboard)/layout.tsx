import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { navItems } from "./nav-config";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  const visibleNav = navItems.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-ink-100 bg-white p-6">
        <div className="font-display text-xl text-ink-700">Registrar</div>
        <nav className="mt-8 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate hover:bg-ink-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-ink-100 bg-white px-8 py-4">
          <div>
            <p className="text-sm text-slate/60">Signed in as</p>
            <p className="font-medium text-ink-700">{profile.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gold-600">
              {profile.role.replace("_", " ")}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
