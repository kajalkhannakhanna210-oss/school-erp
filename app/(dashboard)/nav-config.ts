import type { UserRole } from "@/lib/types";

export type NavItem = { label: string; href: string; roles: UserRole[] };

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["super_admin", "staff", "student"] },
  { label: "Students", href: "/students", roles: ["super_admin", "staff"] },
  { label: "Staff", href: "/staff", roles: ["super_admin"] },
  { label: "Attendance", href: "/attendance", roles: ["super_admin", "staff", "student"] },
  { label: "Fees", href: "/fees", roles: ["super_admin"] },
  { label: "Payments", href: "/payments", roles: ["student"] },
  { label: "Exams", href: "/exams", roles: ["super_admin", "staff", "student"] },
  { label: "Reports", href: "/reports", roles: ["super_admin", "staff"] },
  { label: "Website CMS", href: "/cms", roles: ["super_admin"] },
  { label: "Academic Structure", href: "/academic", roles: ["super_admin"] },
  { label: "Class Teachers", href: "/academic/class-teachers", roles: ["super_admin"] },
  { label: "My Profile", href: "/profile", roles: ["super_admin", "staff", "student"] },
];
