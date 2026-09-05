import type { UserRole } from "@/lib/types";

export type NavItem = { key: string; label: string; href: string; roles: UserRole[]; icon?: string };

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", roles: ["super_admin", "staff", "student"] },
  { key: "login_as_user", label: "Login As User", href: "/login-as", roles: ["super_admin", "organization_admin"], icon: "⇄" },
  { key: "master", label: "Master Data", href: "/master", roles: ["super_admin"] },
  { key: "organization_master", label: "Organization Master", href: "/organization-master", roles: ["super_admin"], icon: "◎" },
  { key: "school_master", label: "School / Branch Master", href: "/school-master", roles: ["super_admin"], icon: "⌂" },
  { key: "wing_master", label: "Wing Master", href: "/wings", roles: ["super_admin", "organization_admin", "school_admin"], icon: "◈" },
  { key: "module_master", label: "Module Master", href: "/module-master", roles: ["super_admin"], icon: "▣" },
  { key: "sessions", label: "Academic Sessions", href: "/master?tab=sessions", roles: ["super_admin"] },
  { key: "classes", label: "Classes", href: "/master?tab=classes", roles: ["super_admin"] },
  { key: "sections", label: "Sections", href: "/master?tab=sections", roles: ["super_admin"] },
  { key: "class_teachers", label: "Class Teachers", href: "/academic/class-teachers", roles: ["super_admin"] },

  // Students submenu items
  { key: "enquiries", label: "Admission Enquiry", href: "/enquiries", roles: ["super_admin", "staff"], icon: "📑" },
  { key: "staff_assignment_rules", label: "Staff Assignment Rules", href: "/admissions-admin/staff-assignment-rules", roles: ["super_admin"], icon: "👥" },
  { key: "students", label: "Student Directory", href: "/students", roles: ["super_admin", "staff"], icon: "♟" },
  { key: "add_student", label: "Add Student", href: "/students/new", roles: ["super_admin", "staff"], icon: "+" },
  { key: "admission_allotment", label: "Admission Allotment", href: "/students/admission-allotment", roles: ["super_admin"], icon: "✓" },
  { key: "leaving_students", label: "Leaving Students", href: "/leaving-students", roles: ["super_admin", "staff"], icon: "🚪" },
  { key: "student_id_cards", label: "ID Cards", href: "/students/id-cards", roles: ["super_admin", "staff"], icon: "▤" },

  // Staff
  { key: "staff", label: "Staff Members", href: "/staff", roles: ["super_admin"], icon: "♚" },
  { key: "add_staff", label: "Add Staff", href: "/staff/new", roles: ["super_admin"], icon: "+" },
  { key: "staff_sessions", label: "Staff Sessions", href: "/staff/session-management", roles: ["super_admin"], icon: "◷" },

  // Examinations
  { key: "exams", label: "Examinations", href: "/exams", roles: ["super_admin", "staff", "student"], icon: "▣" },

  // Fees & Finance
  { key: "fees", label: "Fees", href: "/fees", roles: ["super_admin"], icon: "₹" },
  { key: "payments", label: "Payments", href: "/payments", roles: ["student"], icon: "₹" },

  // Documents
  { key: "documents", label: "Documents", href: "/documents", roles: ["super_admin", "staff"], icon: "▤" },

  // Reports
  { key: "reports", label: "Reports", href: "/reports", roles: ["super_admin", "staff"], icon: "▥" },

  // Login & Security
  { key: "active_users", label: "Active Users", href: "/reports/active-users", roles: ["super_admin"], icon: "▦" },
  { key: "login_activity", label: "Login Activity", href: "/reports/login-activity", roles: ["super_admin"], icon: "◷" },
  { key: "access_logs", label: "Access Logs", href: "/reports/access-logs", roles: ["super_admin"], icon: "📑" },

  // Settings & More
  { key: "attendance", label: "Attendance", href: "/attendance", roles: ["super_admin", "staff", "student"], icon: "◴" },
  { key: "cms", label: "Website CMS", href: "/cms", roles: ["super_admin"], icon: "◆" },
  { key: "admissions", label: "Admissions & Alumni", href: "/admissions-admin", roles: ["super_admin"], icon: "♜" },
  { key: "role_access", label: "Role Page Access", href: "/role-access", roles: ["super_admin"], icon: "⚙" },
  { key: "role_master", label: "Role Master", href: "/role-master", roles: ["super_admin"], icon: "⚙" },
  { key: "organisation_page_access", label: "Organisation Page Access", href: "/access/organisations", roles: ["super_admin"], icon: "▣" },
  { key: "staff_page_access", label: "Staff Page Access", href: "/access/staff", roles: ["super_admin", "organization_admin", "school_admin"], icon: "▣" },
  { key: "profile", label: "My Profile", href: "/profile", roles: ["super_admin", "staff", "student"], icon: "●" },

  // Developer / API tools
  { key: "api_explorer", label: "API Explorer", href: "/api-explorer", roles: ["super_admin"], icon: "🔌" },
];

export const navSections = [
  { key: "support", label: "Support", keys: ["login_as_user"] },
  { key: "administration", label: "Administration", keys: ["organization_master", "school_master", "wing_master", "module_master"] },
  { key: "dashboard", label: "Dashboard", keys: ["dashboard"] },
  { key: "master", label: "Master Data", keys: ["master", "sessions", "classes", "sections", "class_teachers"] },
  { key: "students", label: "Students", keys: ["students", "add_student", "admission_allotment", "leaving_students", "student_id_cards"] },
  { key: "admissions", label: "Admissions", keys: ["enquiries", "staff_assignment_rules"] },
  { key: "staff", label: "Staff", keys: ["staff", "add_staff", "staff_sessions"] },
  { key: "exams", label: "Examinations", keys: ["exams"] },
  { key: "fees", label: "Fees & Finance", keys: ["fees", "payments"] },
  { key: "documents", label: "Document Management", keys: ["documents"] },
  { key: "reports", label: "Reports", keys: ["reports"] },
  { key: "security", label: "Login & Security", keys: ["active_users", "login_activity", "access_logs"] },
  { key: "misc", label: "Settings & More", keys: ["attendance", "cms", "admissions", "role_access", "role_master", "organisation_page_access", "staff_page_access", "profile", "api_explorer"] },
];

export function isNavItemActive(item: NavItem, pathname?: string | null, currentTab?: string | null): boolean {
  if (!pathname) return false;
  const itemPath = item.href.split("?")[0];
  const itemTab = new URLSearchParams(item.href.split("?")[1] ?? "").get("tab");

  if (item.key === "dashboard") {
    return pathname === "/dashboard";
  }
  if (item.key === "master") {
    return pathname === "/master" && !currentTab;
  }
  if (itemTab) {
    return pathname === itemPath && currentTab === itemTab;
  }
  if (item.key === "enquiries") {
    return pathname === "/enquiries" || pathname.startsWith("/enquiries/");
  }
  if (item.key === "staff_assignment_rules") {
    return pathname === "/admissions-admin/staff-assignment-rules" || pathname.startsWith("/admissions-admin/staff-assignment-rules/");
  }
  if (item.key === "students") {
    return (
      pathname === "/students" ||
      (pathname.startsWith("/students/") &&
        !pathname.startsWith("/students/new") &&
        !pathname.startsWith("/students/add") &&
        !pathname.startsWith("/students/admission-allotment"))
    );
  }
  if (item.key === "add_student") {
    return pathname === "/students/new" || pathname === "/students/add";
  }
  if (item.key === "admission_allotment") {
    return pathname === "/students/admission-allotment" || pathname.startsWith("/students/admission-allotment/");
  }
  if (item.key === "leaving_students") {
    return pathname === "/leaving-students" || pathname.startsWith("/leaving-students/");
  }
  if (item.key === "student_id_cards") {
    return pathname === "/students/id-cards" || pathname.startsWith("/students/id-cards/");
  }
  if (item.key === "staff") {
    return (
      pathname === "/staff" ||
      (pathname.startsWith("/staff/") &&
        !pathname.startsWith("/staff/new") &&
        !pathname.startsWith("/staff/session-management"))
    );
  }
  if (item.key === "add_staff") {
    return pathname === "/staff/new" || pathname === "/staff/add";
  }
  if (item.key === "staff_sessions") {
    return pathname === "/staff/session-management" || pathname.startsWith("/staff/session-management/");
  }
  if (item.key === "reports") {
    return (
      pathname === "/reports" ||
      (pathname.startsWith("/reports/") &&
        !pathname.startsWith("/reports/active-users") &&
        !pathname.startsWith("/reports/login-activity") &&
        !pathname.startsWith("/reports/access-logs"))
    );
  }
  if (item.key === "active_users") {
    return pathname === "/reports/active-users" || pathname.startsWith("/reports/active-users/");
  }
  if (item.key === "login_activity") {
    return pathname === "/reports/login-activity" || pathname.startsWith("/reports/login-activity/");
  }
  if (item.key === "access_logs") {
    return pathname === "/reports/access-logs" || pathname.startsWith("/reports/access-logs/");
  }
  if (item.key === "api_explorer") {
    return pathname === "/api-explorer" || pathname.startsWith("/api-explorer/");
  }

  return pathname === itemPath || (itemPath !== "/dashboard" && pathname.startsWith(`${itemPath}/`));
}
