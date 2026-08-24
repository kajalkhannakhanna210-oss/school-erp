"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type NavItem, isNavItemActive } from "./nav-config";

const defaultIcons: Record<string, string> = {
  dashboard: '⌂',
  master: '▦',
  sessions: '◷',
  classes: '▤',
  sections: '▥',
  class_teachers: '♙',
  students: '♟',
  student_directory: '♟',
  add_student: '+',
  student_admission: '✎',
  student_profile: '●',
  admission_allotment: '✓',
  staff: '♚',
  staff_sessions: '◷',
  documents: '▤',
  attendance: '◴',
  exams: '▣',
  fees: '₹',
  payments: '₹',
  reports: '▥',
  login_activity: '◷',
  cms: '◆',
  admissions: '♜',
  role_access: '⚙',
  profile: '●',
  misc: '✦',
  other: '•',
};

export function IconForKey(key: string, _size = 16): React.ReactNode {
  return defaultIcons[key] ?? '•';
}

export function DashboardSidebarNavigation({ items, collapsed = false }: { items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSession = searchParams?.get("session");
  const currentTab = searchParams?.get("tab");

  return (
    <nav aria-label="Dashboard navigation">
      <ul className="mt-1 space-y-1 list-none p-0 m-0">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname, currentTab);
          const href = item.href;

          const baseClasses = collapsed ? "flex items-center justify-center h-10 w-full text-center px-0 rounded-lg transition" : "flex items-center gap-2.5 rounded-lg py-2 px-3 text-sm font-semibold transition";
          const stateClasses = active ? "bg-white/20 text-white font-bold border-l-[3px] border-gold shadow-sm pl-2.5" : "border-transparent text-white/80 hover:bg-white/10 hover:text-white";

          return (
            <li key={item.key} className="px-1">
              <Link href={href} prefetch={true} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`no-underline block ${baseClasses} ${stateClasses} visited:text-white`} style={{ textDecoration: 'none' }}>
                <span aria-hidden className={`text-base flex-shrink-0 ${collapsed ? "" : "mr-2.5 text-white/90"}`}>{item.icon ? <span className="text-white/90">{item.icon}</span> : IconForKey(item.key)}</span>
                {!collapsed && <span className="capitalize text-white/95">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

