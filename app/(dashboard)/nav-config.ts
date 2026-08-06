import type { UserRole } from "@/lib/types";

export type NavItem = { key: string; label: string; href: string; roles: UserRole[] };

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", roles: ["super_admin", "staff", "student"] },
  { key: "master", label: "Master Data", href: "/master", roles: ["super_admin"] },
  { key: "sessions", label: "Academic Sessions", href: "/master?tab=sessions", roles: ["super_admin"] },
  { key: "classes", label: "Classes", href: "/master?tab=classes", roles: ["super_admin"] },
  { key: "sections", label: "Sections", href: "/master?tab=sections", roles: ["super_admin"] },
  { key: "class_teachers", label: "Class Teachers", href: "/academic/class-teachers", roles: ["super_admin"] },
  { key: "students", label: "Students", href: "/students", roles: ["super_admin", "staff"] },
  { key: "admission_allotment", label: "Admission Allotment", href: "/students/admission-allotment", roles: ["super_admin"] },
  { key: "staff", label: "Staff", href: "/staff", roles: ["super_admin"] },
  { key: "attendance", label: "Attendance", href: "/attendance", roles: ["super_admin", "staff", "student"] },
  { key: "exams", label: "Exams", href: "/exams", roles: ["super_admin", "staff", "student"] },
  { key: "fees", label: "Fees", href: "/fees", roles: ["super_admin"] },
  { key: "payments", label: "Payments", href: "/payments", roles: ["student"] },
  { key: "reports", label: "Reports", href: "/reports", roles: ["super_admin", "staff"] },
  { key: "cms", label: "Website CMS", href: "/cms", roles: ["super_admin"] },
  { key: "admissions", label: "Admissions & Alumni", href: "/admissions-admin", roles: ["super_admin"] },
  { key: "role_access", label: "Role Page Access", href: "/role-access", roles: ["super_admin"] },
  { key: "profile", label: "My Profile", href: "/profile", roles: ["super_admin", "staff", "student"] },
];
