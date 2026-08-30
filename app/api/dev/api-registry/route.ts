import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/dev/api-registry
//
// Returns a static registry of all documented API endpoints in this project.
// Used by the admin API Explorer page.
// Requires authentication (super_admin or staff).
// ---------------------------------------------------------------------------

export interface ApiEntry {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  category: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  responseExample?: string;
  addedOn?: string;
  tags?: string[];
}

const API_REGISTRY: ApiEntry[] = [
  // ── Students ──────────────────────────────────────────────────────────────
  {
    id: "students-list",
    name: "List Students",
    method: "GET",
    path: "/api/students",
    description: "Paginated list of students with optional filters for session, class, section, admission status and search.",
    category: "Students",
    auth: true,
    params: [
      { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
      { name: "pageSize", type: "number", required: false, description: "Items per page (1–100, default: 10)" },
      { name: "session", type: "string", required: false, description: "Filter by academic session ID" },
      { name: "class", type: "string", required: false, description: "Filter by class ID" },
      { name: "section", type: "string", required: false, description: "Filter by section ID" },
      { name: "q", type: "string", required: false, description: "Search by admission number or mobile" },
      { name: "tab", type: "string", required: false, description: "new | old | archived | left | admission-assigned" },
    ],
    responseExample: '{ "rows": [...], "count": 120 }',
    addedOn: "2024-01-01",
    tags: ["students", "paginated"],
  },
  {
    id: "students-birthdays",
    name: "Student Birthdays",
    method: "GET",
    path: "/api/students/birthdays",
    description: "Returns active students whose birthday falls today or within the next N days (default 7). Sorted by proximity. Includes signed photo URLs.",
    category: "Students",
    auth: true,
    params: [
      { name: "days", type: "number", required: false, description: "Look-ahead window in days (default: 7, max: 365)" },
      { name: "class", type: "string", required: false, description: "Filter by class ID" },
      { name: "section", type: "string", required: false, description: "Filter by section ID" },
      { name: "session", type: "string", required: false, description: "Filter by academic session ID" },
    ],
    responseExample: '{ "students": [{ "id": "...", "full_name": "Arjun Sharma", "date_of_birth": "2010-09-01", "days_until_birthday": 2, "class": "Class 5", ... }], "count": 3 }',
    addedOn: "2026-08-30",
    tags: ["students", "birthdays", "new"],
  },
  {
    id: "student-detail",
    name: "Get Student",
    method: "GET",
    path: "/api/students/[id]",
    description: "Fetch full details of a single student by ID.",
    category: "Students",
    auth: true,
    params: [{ name: "id", type: "string (UUID)", required: true, description: "Student ID" }],
    responseExample: '{ "student": { "id": "...", "admission_number": "2024001", ... } }',
    addedOn: "2024-01-01",
    tags: ["students"],
  },
  {
    id: "students-directory",
    name: "Public Student Directory",
    method: "GET",
    path: "/api/students/directory",
    description: "Public-facing endpoint returning a minimal, safe list of active students for the school home page. No sensitive fields exposed.",
    category: "Students",
    auth: false,
    params: [],
    responseExample: '{ "students": [{ "name": "Arjun Sharma", "photo_url": "...", "class": "Class 5", ... }], "count": 50 }',
    addedOn: "2024-01-01",
    tags: ["students", "public"],
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    id: "reports-export",
    name: "Export Report",
    method: "GET",
    path: "/api/reports/[type]",
    description: "Export fee, attendance, or other reports as PDF or Excel. Type can be: collection, pending-fees, concessions, late-fees, attendance, leaving-students.",
    category: "Reports",
    auth: true,
    params: [
      { name: "type", type: "string", required: true, description: "Report type slug" },
      { name: "format", type: "pdf | excel", required: true, description: "Output format" },
      { name: "class", type: "string", required: false, description: "Filter by class ID" },
      { name: "section", type: "string", required: false, description: "Filter by section ID" },
    ],
    addedOn: "2024-01-01",
    tags: ["reports", "export"],
  },
  {
    id: "reports-access-logs",
    name: "Access Logs",
    method: "GET",
    path: "/api/reports/access-logs",
    description: "Returns recent access log entries. Super admin only.",
    category: "Reports",
    auth: true,
    addedOn: "2024-06-01",
    tags: ["reports", "security"],
  },
  {
    id: "reports-login-activity",
    name: "Login Activity",
    method: "GET",
    path: "/api/reports/login-activity",
    description: "Returns recent login events, IP addresses, device info. Super admin only.",
    category: "Reports",
    auth: true,
    addedOn: "2024-06-01",
    tags: ["reports", "security"],
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  {
    id: "documents-list",
    name: "List Documents",
    method: "GET",
    path: "/api/documents",
    description: "Returns documents scoped to the authenticated user's role and permissions.",
    category: "Documents",
    auth: true,
    addedOn: "2024-03-01",
    tags: ["documents"],
  },

  // ── Enquiries ─────────────────────────────────────────────────────────────
  {
    id: "enquiries-list",
    name: "List Enquiries",
    method: "GET",
    path: "/api/enquiries",
    description: "Returns admission enquiries with optional status and date filters.",
    category: "Admissions",
    auth: true,
    addedOn: "2024-02-01",
    tags: ["admissions", "enquiries"],
  },

  // ── Admissions ────────────────────────────────────────────────────────────
  {
    id: "admissions-submit",
    name: "Submit Admission Form",
    method: "POST",
    path: "/api/admissions",
    description: "Public endpoint to submit a new admission enquiry form. Includes CAPTCHA and rate limiting.",
    category: "Admissions",
    auth: false,
    addedOn: "2024-02-01",
    tags: ["admissions", "public"],
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    id: "auth-session",
    name: "Auth Session",
    method: "GET",
    path: "/api/auth/session",
    description: "Returns the current user session and profile info.",
    category: "Auth",
    auth: true,
    addedOn: "2024-01-01",
    tags: ["auth"],
  },

  // ── Webhooks ──────────────────────────────────────────────────────────────
  {
    id: "webhook-razorpay",
    name: "Razorpay Webhook",
    method: "POST",
    path: "/api/webhooks/razorpay",
    description: "Handles incoming Razorpay payment events. Verified via HMAC signature.",
    category: "Webhooks",
    auth: false,
    addedOn: "2024-04-01",
    tags: ["payments", "webhooks"],
  },

  // ── ID Cards ──────────────────────────────────────────────────────────────
  {
    id: "id-card-pdf",
    name: "Generate ID Card PDF",
    method: "GET",
    path: "/api/students/[id]/card-pdf",
    description: "Generates and streams a PDF ID card for a single student.",
    category: "Students",
    auth: true,
    params: [{ name: "id", type: "string (UUID)", required: true, description: "Student ID" }],
    addedOn: "2024-05-01",
    tags: ["students", "id-cards"],
  },

  // ── Receipts ──────────────────────────────────────────────────────────────
  {
    id: "receipts-pdf",
    name: "Fee Receipt PDF",
    method: "GET",
    path: "/api/receipts/[id]",
    description: "Generates a printable fee receipt PDF for a given receipt ID.",
    category: "Fees",
    auth: true,
    addedOn: "2024-04-01",
    tags: ["fees", "receipts"],
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  {
    id: "contact-form",
    name: "Contact Form",
    method: "POST",
    path: "/api/contact",
    description: "Public contact form submission endpoint. Includes rate limiting and CAPTCHA.",
    category: "Public",
    auth: false,
    addedOn: "2024-01-01",
    tags: ["public", "contact"],
  },
];

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth guard
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile?.role || !["super_admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categories = [...new Set(API_REGISTRY.map((a) => a.category))];

    return NextResponse.json({
      apis: API_REGISTRY,
      count: API_REGISTRY.length,
      categories,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
