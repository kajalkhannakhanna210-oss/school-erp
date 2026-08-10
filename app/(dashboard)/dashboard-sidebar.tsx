"use client";

import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { DashboardSidebarNavigation } from "./sidebar-navigation";
import type { NavItem } from "./nav-config";

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return <aside className={`hidden border-r border-ink-900 p-4 transition-all duration-200 lg:block ${collapsed ? "w-20" : "w-[260px]"}`} style={{ backgroundColor: "#222F57" }}>
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-start"}`}>
        {!collapsed && <div className="flex items-center gap-3 px-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gold text-sm font-bold text-ink-900">R</div><div className="font-display text-lg font-bold tracking-tight text-white">Registrar</div></div>}
        <div className="flex items-center gap-1 ml-auto">
          <SignOutButton collapsed={collapsed} />
          <button type="button" aria-label={collapsed ? "Expand menu" : "Collapse menu"} onClick={() => setCollapsed(!collapsed)} className="rounded-lg px-2 py-2 text-xl text-white hover:bg-white/10">{collapsed ? "☰" : "‹"}</button>
        </div>
      </div>
      {!collapsed && <p className="text-xs text-white/60 px-2">School Management</p>}
    </div>
    <DashboardSidebarNavigation items={items} collapsed={collapsed} />
  </aside>;
}
