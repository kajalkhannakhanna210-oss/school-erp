"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type NavItem, isNavItemActive } from "./nav-config";
import { SignOutButton } from "./sign-out-button";
import { IconForKey } from "./sidebar-navigation";

export function DashboardMobileNavigation({
  items,
  sections,
}: {
  items: NavItem[];
  sections?: { section: { key: string; label: string; keys: string[] }; items: NavItem[] }[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");
  const selectedSession = searchParams?.get("session");

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  function toggleSection(key: string) {
    setExpandedMap((prev) => {
      const isCurrentlyOpen = Boolean(prev[key]);
      return isCurrentlyOpen ? {} : { [key]: true };
    });
  }

  // Auto expand current section
  useEffect(() => {
    if (sections) {
      for (const { section, items: secItems } of sections) {
        const hasActive = secItems.some((item) => isNavItemActive(item, pathname, currentTab));
        if (hasActive) {
          setExpandedMap({ [section.key]: true });
          break;
        }
      }
    }
  }, [pathname, currentTab, sections]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open dashboard menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 px-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-none stroke-current stroke-[2.5]">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Menu</span>
      </button>

      {open && (
        <div className="fixed inset-0" style={{ zIndex: 9999 }}>
          <button
            type="button"
            aria-label="Close dashboard menu"
            onClick={() => setOpen(false)}
            className="mobile-menu-backdrop absolute inset-0 bg-ink-900/60"
          />
          <nav
            aria-label="Dashboard navigation"
            className="mobile-menu-drawer absolute left-0 top-0 flex h-full w-[min(19rem,calc(100vw-1.25rem))] flex-col text-white shadow-2xl"
            style={{ backgroundColor: "#222F57", zIndex: 10000 }}
          >
            <div className="flex items-center justify-between border-b border-white/20 px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-sm font-bold text-ink-900">
                  R
                </span>
                <div>
                  <p className="font-display text-lg font-bold">Registrar</p>
                  <p className="text-xs text-white/60">School Management</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dashboard menu"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 text-white hover:bg-white/10"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]">
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80">
                Navigation
              </p>

              {sections && sections.length > 0 ? (
                sections.map(({ section, items: secItems }) => {
                  const isDashboard = section.key === "dashboard" && secItems.length === 1;
                  const singleItem = secItems[0];
                  const isExpanded = Boolean(expandedMap[section.key]);

                  const hasActive = secItems.some((item) => isNavItemActive(item, pathname, currentTab));

                  if (isDashboard && singleItem) {
                    const active = isNavItemActive(singleItem, pathname, currentTab);
                    const href = singleItem.href;

                    return (
                      <div key={section.key} className="border-b border-white/15 pb-2">
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-lg py-2.5 px-3 text-sm font-semibold transition ${
                            active ? "bg-white/20 text-white font-bold border-l-[3px] border-gold pl-2.5" : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center text-base">
                            {singleItem.icon ?? IconForKey(section.key)}
                          </span>
                          <span>{singleItem.label}</span>
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <div key={section.key} className="border-b border-white/15 pb-2">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        aria-expanded={isExpanded}
                        className={`flex w-full items-center justify-between rounded-lg transition px-3 py-2.5 text-sm ${
                          hasActive
                            ? "text-gold font-bold bg-white/10"
                            : "text-white font-semibold bg-transparent hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center text-base ${hasActive ? "text-gold" : ""}`}>
                            {IconForKey(section.key)}
                          </span>
                          <span>{section.label}</span>
                        </div>
                        <span className={`transition-transform duration-200 ${hasActive ? "text-gold" : "text-white/70"} ${isExpanded ? "rotate-90" : "rotate-0"}`}>
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-1 pl-4 space-y-1">
                          {secItems.map((subItem) => {
                            const active = isNavItemActive(subItem, pathname, currentTab);
                            const href = subItem.href;

                            return (
                              <Link
                                key={subItem.href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className={`flex items-center gap-3 rounded-lg py-2 px-3 text-xs font-semibold transition ${
                                  active ? "bg-white/20 text-white font-bold border-l-[3px] border-gold pl-2.5" : "text-white/80 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span aria-hidden="true" className="shrink-0 text-sm">
                                  {subItem.icon ?? "•"}
                                </span>
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="space-y-1">
                  {items.map((item) => {
                    const itemPath = item.href.split("?")[0];
                    const active = item.key === "reports" ? pathname === "/reports" : pathname === itemPath;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg py-3 pr-3 text-sm font-semibold transition ${
                          item.key === "login_activity" ? "pl-10" : "pl-3"
                        } ${active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                      >
                        <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center text-lg leading-none">
                          {item.icon ?? "•"}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/20 px-4 py-4 flex items-center justify-center">
              <SignOutButton />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
