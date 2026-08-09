"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavItem } from "./nav-config";

export function DashboardSidebarNavigation({ items, collapsed = false }: { items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSession = searchParams?.get("session");

  return <nav className="mt-9 space-y-1" aria-label="Dashboard navigation">
    {items.map((item) => {
      const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/students" && pathname?.startsWith(`${item.href}/`));
      const href = selectedSession ? `${item.href}${item.href.includes("?") ? "&" : "?"}session=${selectedSession}` : item.href;
      return <Link key={item.href} href={href} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`block rounded-lg border-l-2 py-2.5 text-sm font-semibold transition-colors ${collapsed ? "px-2 text-center" : "px-3"} ${active ? "border-gold bg-white/15 text-white" : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"}`}>
        <span aria-hidden="true" className={`text-lg ${collapsed ? "" : "mr-3"}`}>{item.icon ?? "•"}</span>{!collapsed && item.label}
      </Link>;
    })}
  </nav>;
}
