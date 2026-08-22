"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { DashboardSidebarNavigation, IconForKey } from "./sidebar-navigation";
import { type NavItem, isNavItemActive } from "./nav-config";

export function DashboardSidebar({
  sections,
  profile,
}: {
  sections: { section: { key: string; label: string; keys: string[] }; items: NavItem[] }[];
  profile?: any;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");
  const selectedSession = searchParams?.get("session");

  const STORAGE_KEY = "erp:sidebar:expanded";
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s, idx) => {
      init[s.section.key] = idx === 0;
    });
    return init;
  });

  // Sync expanded state from localStorage and active route on client
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setExpandedMap(parsed);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    for (const { section, items } of sections) {
      const hasActiveChild = items.some((item) => isNavItemActive(item, pathname, currentTab));
      if (hasActiveChild) {
        setExpandedMap({ [section.key]: true });
        break;
      }
    }
  }, [pathname, currentTab, sections]);

  function toggleSection(key: string) {
    setExpandedMap((prev) => {
      const isCurrentlyOpen = Boolean(prev[key]);
      const next = isCurrentlyOpen ? {} : { [key]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }

  // Keep persisted collapsed state as well
  const COLLAPSE_KEY = "erp:sidebar:collapsed";
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSE_KEY) : null;
      if (raw !== null) setCollapsed(raw === "1");
    } catch (e) {}
  }, []);

  function setCollapsedAndPersist(v: boolean) {
    try {
      localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    } catch (e) {}
    setCollapsed(v);
  }

  return (
    <aside
      className={`hidden border-r border-white/15 p-4 transition-all duration-200 lg:block no-scrollbar overflow-y-auto ${collapsed ? "w-20" : "w-[268px]"}`}
      style={{ backgroundColor: "#222F57" }}
    >
      {/* Sidebar Header with School Branding */}
      <div className="flex flex-col gap-2 border-b border-white/20 pb-4">
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-start"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold text-sm font-bold text-ink-900 shadow-sm">
                R
              </div>
              <div>
                <div className="font-display text-base font-bold tracking-tight text-white">Registrar</div>
                <p className="text-[11px] text-white/60">School Management</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <SignOutButton collapsed={collapsed} />
            <button
              type="button"
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              onClick={() => setCollapsedAndPersist(!collapsed)}
              className="rounded-lg px-2 py-1.5 text-lg text-white hover:bg-white/10 transition"
            >
              {collapsed ? "☰" : "‹"}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Menu & Submenus from Database */}
      <nav className="mt-4 space-y-2.5 overflow-y-auto max-h-[calc(100vh-8rem)] no-scrollbar" aria-label="Sidebar Menu">
        {sections.map(({ section, items }) => {
          const isDashboard = section.key === "dashboard" && items.length === 1;
          const singleItem = items[0];
          const isExpanded = Boolean(expandedMap[section.key]);

          const hasActiveChild = items.some((item) => isNavItemActive(item, pathname, currentTab));

          if (isDashboard && singleItem) {
            const active = isNavItemActive(singleItem, pathname, currentTab);
            const href = singleItem.href;

            return (
              <div key={section.key} className="border-b border-white/15 pb-2.5 last:border-b-0">
                <Link
                  href={href}
                  title={collapsed ? singleItem.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg py-2 px-3 text-sm font-semibold transition no-underline ${
                    active ? "bg-white/20 text-white font-bold border-l-[3px] border-gold shadow-sm pl-2.5" : "text-white/80 hover:bg-white/10 hover:text-white"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <span aria-hidden className={`text-base shrink-0 ${collapsed ? "" : "text-white/90"}`}>
                    {singleItem.icon ? <span>{singleItem.icon}</span> : IconForKey(section.key, 16)}
                  </span>
                  {!collapsed && <span className="truncate">{singleItem.label}</span>}
                </Link>
              </div>
            );
          }

          // Multi-item section or submenu menu (e.g. Login Activity, Master Data, Students, Staff, etc.)
          return (
            <div key={section.key} className="border-b border-white/15 pb-2.5 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                aria-expanded={isExpanded}
                className={`flex items-center justify-between w-full text-left rounded-lg transition px-3 py-2 text-sm ${
                  hasActiveChild
                    ? "text-gold font-bold bg-white/10"
                    : "text-white font-semibold bg-transparent hover:bg-white/10"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? section.label : (isExpanded ? "Collapse section" : "Expand section")}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span aria-hidden className={`shrink-0 text-base ${hasActiveChild ? "text-gold" : "text-white/90"}`}>
                    {IconForKey(section.key, 16)}
                  </span>
                  {!collapsed && <span className="truncate">{section.label}</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`ml-2 inline-flex items-center transition-transform duration-200 ${
                      hasActiveChild ? "text-gold" : "text-white/70"
                    } ${isExpanded ? "rotate-90" : "rotate-0"}`}
                    aria-hidden="true"
                  >
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Submenu Items */}
              <div className={`mt-1 pl-2 ${isExpanded ? "block" : "hidden"}`}>
                <DashboardSidebarNavigation items={items} collapsed={collapsed} />
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
