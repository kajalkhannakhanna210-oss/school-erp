import type { NextRequest } from "next/server";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import type { UserRole } from "../types";

export type AccessLogInput = {
  userId?: string | null;
  userName?: string | null;
  email?: string | null;
  role?: UserRole | null;
  module?: string;
  page?: string;
  resource: string;
  requestMethod: string;
  action: string;
  statusCode: number;
  request?: NextRequest;
  ipAddress?: string | null;
  responseTimeMs?: number;
  sessionReference?: string | null;
  requestId?: string | null;
  outcome?: string | null;
};

export function parseAccessUserAgent(userAgent: string | null) {
  const browserMatch = userAgent?.match(/(Edg|Chrome|Firefox|Safari|Opera|PostmanRuntime|curl|python-requests)\/?([\d.]+)?/i);
  const osMatch = userAgent?.match(/(Windows NT|Mac OS X|Android|iPhone OS|iPad|Linux)[\s\d._-]*/i);
  const isMobile = /mobile|iphone|android/i.test(userAgent ?? "");
  const isTablet = /ipad|tablet/i.test(userAgent ?? "");
  const deviceType = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  let browser = "Other";
  if (browserMatch) {
    const rawName = browserMatch[1];
    const version = browserMatch[2] ? ` ${browserMatch[2].split(".")[0]}` : "";
    if (/edg/i.test(rawName)) browser = `Edge${version}`;
    else if (/chrome/i.test(rawName)) browser = `Chrome${version}`;
    else if (/firefox/i.test(rawName)) browser = `Firefox${version}`;
    else if (/safari/i.test(rawName)) browser = `Safari${version}`;
    else if (/opera/i.test(rawName)) browser = `Opera${version}`;
    else browser = `${rawName}${version}`;
  }

  let operatingSystem = "Other";
  if (osMatch) {
    const raw = osMatch[0];
    if (/windows nt 10/i.test(raw)) operatingSystem = "Windows 10/11";
    else if (/windows/i.test(raw)) operatingSystem = "Windows";
    else if (/mac os x/i.test(raw)) operatingSystem = "macOS";
    else if (/iphone|ipad/i.test(raw)) operatingSystem = "iOS";
    else if (/android/i.test(raw)) operatingSystem = "Android";
    else if (/linux/i.test(raw)) operatingSystem = "Linux";
    else operatingSystem = raw.replace(/_/g, ".");
  }

  return { browser, operatingSystem, deviceType };
}

export function inferModuleAndPage(pathname: string): { module: string; page: string } {
  const cleanPath = (pathname || "").split("?")[0].toLowerCase();

  if (cleanPath === "/dashboard") return { module: "Dashboard", page: "Executive Dashboard" };
  if (cleanPath === "/") return { module: "Public Website", page: "Home Page" };
  if (cleanPath.startsWith("/students/new")) return { module: "Students", page: "Add Student Form" };
  if (cleanPath.startsWith("/students/admission-allotment")) return { module: "Students", page: "Admission Allotment" };
  if (cleanPath.match(/\/students\/[^/]+\/edit/)) return { module: "Students", page: "Edit Student" };
  if (cleanPath.match(/\/students\/[^/]+/)) return { module: "Students", page: "Student Profile" };
  if (cleanPath.startsWith("/students")) return { module: "Students", page: "Student Directory" };
  if (cleanPath.startsWith("/attendance")) return { module: "Attendance", page: "Attendance Register" };
  if (cleanPath.startsWith("/fees")) return { module: "Fees & Finance", page: "Fee Management" };
  if (cleanPath.startsWith("/payments")) return { module: "Fees & Finance", page: "Fee Payment Portal" };
  if (cleanPath.startsWith("/exams/marks")) return { module: "Examination", page: "Marks Entry" };
  if (cleanPath.startsWith("/exams")) return { module: "Examination", page: "Exam Marks & Results" };
  if (cleanPath.startsWith("/staff/session-management")) return { module: "Staff", page: "Staff Session Assignment" };
  if (cleanPath.startsWith("/staff/new")) return { module: "Staff", page: "Add Staff Form" };
  if (cleanPath.match(/\/staff\/[^/]+\/edit/)) return { module: "Staff", page: "Edit Staff" };
  if (cleanPath.match(/\/staff\/[^/]+/)) return { module: "Staff", page: "Staff Profile" };
  if (cleanPath.startsWith("/staff")) return { module: "Staff", page: "Staff Directory" };
  if (cleanPath.startsWith("/master")) return { module: "Academics", page: "Master Academic Data" };
  if (cleanPath.startsWith("/academic/class-teachers")) return { module: "Academics", page: "Class Teachers & Allocation" };
  if (cleanPath.startsWith("/academic")) return { module: "Academics", page: "Academic Structure" };
  if (cleanPath.startsWith("/documents")) return { module: "Documents", page: "Document Vault" };
  if (cleanPath.startsWith("/reports/active-users")) return { module: "Reports", page: "Active Users Report" };
  if (cleanPath.startsWith("/reports/login-activity")) return { module: "Reports", page: "Login Activity Log" };
  if (cleanPath.startsWith("/reports/access-logs")) return { module: "Reports", page: "Access Logs Report" };
  if (cleanPath.startsWith("/reports")) return { module: "Reports", page: "System Reports" };
  if (cleanPath.startsWith("/cms")) return { module: "Website CMS", page: "Content Management" };
  if (cleanPath.startsWith("/admissions-admin")) return { module: "Admissions", page: "Admissions Admin" };
  if (cleanPath.startsWith("/admissions")) return { module: "Admissions", page: "Public Admissions & Enquiries" };
  if (cleanPath.startsWith("/role-access")) return { module: "Settings", page: "Role Page Permissions" };
  if (cleanPath.startsWith("/profile")) return { module: "Profile", page: "User Profile" };
  if (cleanPath.startsWith("/about")) return { module: "Public Website", page: "About School" };
  if (cleanPath.startsWith("/principal-message")) return { module: "Public Website", page: "Principal's Message" };
  if (cleanPath.startsWith("/chairman-message")) return { module: "Public Website", page: "Chairman's Message" };
  if (cleanPath.startsWith("/facilities")) return { module: "Public Website", page: "School Facilities" };
  if (cleanPath.startsWith("/academics")) return { module: "Public Website", page: "Public Academics" };
  if (cleanPath.startsWith("/fee-structure")) return { module: "Public Website", page: "Fee Structure" };
  if (cleanPath.startsWith("/alumni")) return { module: "Public Website", page: "Alumni Directory" };
  if (cleanPath.startsWith("/gallery")) return { module: "Public Website", page: "Photo Gallery" };
  if (cleanPath.startsWith("/events")) return { module: "Public Website", page: "School Events" };
  if (cleanPath.startsWith("/notices")) return { module: "Public Website", page: "Notice Board" };
  if (cleanPath.startsWith("/contact")) return { module: "Public Website", page: "Contact Us" };
  if (cleanPath.startsWith("/login") || cleanPath.startsWith("/admin/login")) return { module: "Auth", page: "Sign In" };
  if (cleanPath.startsWith("/forgot-password")) return { module: "Auth", page: "Password Reset" };
  if (cleanPath.startsWith("/api/auth")) return { module: "Auth", page: "Authentication Service" };
  if (cleanPath.startsWith("/api/reports")) return { module: "Reports", page: "Report Export Engine" };
  if (cleanPath.startsWith("/api/audit")) return { module: "Security", page: "Audit Logger" };
  if (cleanPath.startsWith("/api/receipts")) return { module: "Fees & Finance", page: "Receipt Generator" };
  if (cleanPath.startsWith("/api/documents")) return { module: "Documents", page: "Document Service" };
  if (cleanPath.startsWith("/api/admissions")) return { module: "Admissions", page: "Admissions API" };
  if (cleanPath.startsWith("/api/contact")) return { module: "Public Website", page: "Contact API" };
  if (cleanPath.startsWith("/api")) return { module: "API", page: "Internal API Endpoint" };

  return { module: "General", page: pathname || "Page" };
}

export function sanitizeClientIp(request?: NextRequest, explicitIp?: string | null): string {
  const raw = explicitIp
    ?? request?.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request?.headers.get("x-real-ip")
    ?? "127.0.0.1";

  // Prevent injection in IP field
  return raw.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45);
}

export async function recordAccessLog(input: AccessLogInput) {
  try {
    const admin = createAdminClient();
    let userName = input.userName ?? null;
    let email = input.email ?? null;
    let role = input.role ?? null;

    if (input.userId && (!userName || !email || !role)) {
      const [{ data: profile }, { data: authUser }] = await Promise.all([
        admin.from("profiles").select("full_name, role").eq("id", input.userId).maybeSingle(),
        admin.auth.admin.getUserById(input.userId),
      ]);
      userName = userName ?? profile?.full_name ?? null;
      role = role ?? (profile?.role as UserRole | null) ?? null;
      email = email ?? authUser.user?.email ?? null;
    }

    const userAgent = input.request?.headers.get("user-agent") ?? null;
    const clientDetails = parseAccessUserAgent(userAgent);
    const ipAddress = sanitizeClientIp(input.request, input.ipAddress);
    const inferred = inferModuleAndPage(input.resource);

    const safeSessionRef = input.sessionReference ? input.sessionReference.slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, "") : null;
    const safeRequestId = input.requestId ?? `req_${Math.random().toString(36).slice(2, 10)}`;

    const { error: insertError } = await admin.from("access_logs").insert({
      user_id: input.userId ?? null,
      user_name: userName,
      email,
      role,
      module: input.module ?? inferred.module,
      page: input.page ?? inferred.page,
      resource: input.resource.slice(0, 255),
      request_method: input.requestMethod.toUpperCase().slice(0, 10),
      action: input.action.slice(0, 50),
      status_code: input.statusCode,
      ip_address: ipAddress,
      device: clientDetails.deviceType,
      browser: clientDetails.browser,
      operating_system: clientDetails.operatingSystem,
      user_agent: userAgent?.slice(0, 500) ?? null,
      response_time_ms: Math.max(0, input.responseTimeMs ?? 0),
      session_reference: safeSessionRef,
      request_id: safeRequestId,
      outcome: (input.outcome ?? (input.statusCode < 400 ? "Success" : input.statusCode === 401 ? "Unauthorized" : input.statusCode === 403 ? "Forbidden" : "Error")).slice(0, 200),
    });

    if (insertError) {
      // Fallback: persist in login_activities table with valid event_type constraint so it is immediately recorded in PostgreSQL!
      const fallbackEventType =
        input.statusCode === 403
          ? "role_access_denied"
          : input.statusCode >= 400
          ? "unauthorized_access_attempt"
          : "successful_login";

      const fallbackStatus =
        input.statusCode < 400 ? "success" : input.statusCode === 403 ? "blocked" : "failed";

      const validInetIp = ipAddress && (ipAddress.includes(".") || ipAddress.includes(":")) ? ipAddress : "127.0.0.1";

      await admin.from("login_activities").insert({
        user_id: input.userId ?? null,
        user_name: userName,
        email,
        role,
        event_type: fallbackEventType,
        status: fallbackStatus,
        ip_address: validInetIp,
        browser: clientDetails.browser,
        operating_system: clientDetails.operatingSystem,
        device_type: clientDetails.deviceType,
        user_agent: userAgent?.slice(0, 500) ?? null,
        failure_reason: input.statusCode >= 400 ? input.outcome : null,
        metadata: {
          isPageAccess: true,
          module: input.module ?? inferred.module,
          page: input.page ?? inferred.page,
          resource: input.resource.slice(0, 255),
          requestMethod: input.requestMethod.toUpperCase().slice(0, 10),
          action: input.action.slice(0, 50),
          statusCode: input.statusCode,
          responseTimeMs: Math.max(0, input.responseTimeMs ?? 0),
          outcome: input.outcome ?? "Success",
        },
      });
    }
  } catch (error) {
    console.warn("Failed to record access log", error instanceof Error ? error.message : "unknown error");
  }
}

export async function recordServerAction({
  action,
  resource,
  module,
  page,
  statusCode = 200,
  outcome,
  requestMethod = "POST",
  userId,
  responseTimeMs = 140,
}: {
  action: string;
  resource: string;
  module?: string;
  page?: string;
  statusCode?: number;
  outcome?: string;
  requestMethod?: string;
  userId?: string | null;
  responseTimeMs?: number;
}) {
  try {
    const supabase = await createClient();
    let currentUserId = userId;
    let userName: string | null = null;
    let email: string | null = null;
    let role: UserRole | null = null;

    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id ?? null;
      email = user?.email ?? null;
    }

    if (currentUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", currentUserId)
        .maybeSingle();

      userName = profile?.full_name ?? email ?? null;
      role = (profile?.role as UserRole) ?? null;
    }

    const inferred = inferModuleAndPage(resource);

    await recordAccessLog({
      userId: currentUserId,
      userName,
      email,
      role,
      module: module ?? inferred.module,
      page: page ?? inferred.page,
      resource,
      requestMethod,
      action,
      statusCode,
      responseTimeMs,
      outcome: outcome ?? `${action} completed successfully`,
    });
  } catch (err) {
    console.warn("Failed to record server action log", err);
  }
}

