"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavItem } from "./nav-config";

export function DashboardSidebarNavigation({ items, collapsed = false }: { items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSession = searchParams?.get("session");
  const currentTab = searchParams?.get("tab");

  return <nav className="mt-9 space-y-1" aria-label="Dashboard navigation">
    {items.map((item) => {
      const itemPath = item.href.split("?")[0];
      const itemTab = new URLSearchParams(item.href.split("?")[1]).get("tab");
      
      let active = false;
      if (item.key === "reports") {
        active = pathname === "/reports";
      } else if (item.key === "master") {
        // Master Data is active when on /master with no tab or unrecognized tab
        active = pathname === "/master" && !currentTab;
      } else if (itemTab) {
        // Items with query params are active when pathname matches AND tab matches
        active = pathname === itemPath && currentTab === itemTab;
      } else {
        // Default logic for items without query params
        active = pathname === itemPath || (itemPath !== "/dashboard" && itemPath !== "/students" && pathname?.startsWith(`${itemPath}/`));
      }
      
      const href = selectedSession ? `${item.href}${item.href.includes("?") ? "&" : "?"}session=${selectedSession}` : item.href;
      return <Link key={item.href} href={href} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`block rounded-lg border-l-2 py-2.5 text-sm font-semibold transition-colors ${collapsed ? "px-2 text-center" : item.key === "login_activity" ? "pl-10 pr-3" : "px-3"} ${active ? "border-gold bg-white/15 text-white" : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"}`}>
        <span aria-hidden="true" className={`text-lg ${collapsed ? "" : "mr-3"}`} style={{ fontFamily: 'Apple Color Emoji, "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif' }}>{item.icon ?? "•"}</span>{!collapsed && item.label}
      </Link>;
    })}
  </nav>;
}
