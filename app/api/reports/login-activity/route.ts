import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { renderReportPdf } from "../[type]/report-pdf";

export const runtime = "nodejs";

const columns = [
  ["created_at", "Date and time"], ["user_name", "User"], ["email", "Email"], ["role", "Role"],
  ["event_type", "Event type"], ["status", "Status"], ["ip_address", "IP address"], ["device_type", "Device"],
  ["browser", "Browser"], ["operating_system", "Operating system"], ["login_at", "Login time"],
  ["logout_at", "Logout time"], ["session_duration", "Session duration"], ["failure_reason", "Failure reason"],
] as const;

function display(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && (value.includes("T") || value.endsWith("Z"))) return new Date(value).toLocaleString("en-IN");
  return String(value);
}

export async function GET(req: NextRequest) {
  try {
    await requirePageAccess("login_activity");
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const params = req.nextUrl.searchParams;
  const format = params.get("format") ?? "csv";
  if (!["csv", "excel", "pdf"].includes(format)) {
    return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
  }

  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const role = params.get("role");
  const eventType = params.get("eventType");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");

  let request = supabase
    .from("login_activities")
    .select(columns.map(([key]) => (key === "session_duration" ? "session_duration_seconds" : key)).join(","))
    .order("created_at", { ascending: false })
    .limit(5000);

  const safeQuery = query.replace(/[^a-zA-Z0-9@._ -]/g, "");
  if (safeQuery) {
    request = request.or(`user_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,ip_address.ilike.%${safeQuery}%,browser.ilike.%${safeQuery}%`);
  }

  if (role && role !== "all" && ["super_admin", "staff", "student"].includes(role)) {
    request = request.eq("role", role);
  }

  if (eventType && eventType !== "all") {
    request = request.eq("event_type", eventType);
  }

  if (status && status !== "all" && ["success", "failed", "blocked"].includes(status)) {
    request = request.eq("status", status);
  }

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    request = request.gte("created_at", `${from}T00:00:00.000Z`);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    request = request.lte("created_at", `${to}T23:59:59.999Z`);
  }

  const { data, error } = await request;
  if (error) return NextResponse.json({ error: "Could not generate report" }, { status: 500 });

  const rows = (data ?? []).map((row: any) => ({
    created_at: display(row.created_at), user_name: row.user_name ?? "Unknown user", email: row.email ?? "—",
    role: row.role === "super_admin" ? "Admin" : row.role === "staff" ? "Teacher" : row.role ?? "—",
    event_type: String(row.event_type).replaceAll("_", " "), status: row.status, ip_address: row.ip_address ?? "—",
    device_type: row.device_type ?? "—", browser: row.browser ?? "—", operating_system: row.operating_system ?? "—",
    login_at: display(row.login_at), logout_at: display(row.logout_at),
    session_duration: row.session_duration_seconds == null ? "—" : `${Math.floor(row.session_duration_seconds / 60)}m ${row.session_duration_seconds % 60}s`,
    failure_reason: row.failure_reason ?? "—",
  }));
  const title = "Login Activity Report";
  const generated = new Date().toLocaleString("en-IN");

  if (format === "csv") {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [`${title} - Generated ${generated}`, columns.map(([, label]) => escape(label)).join(","), ...rows.map((row) => columns.map(([key]) => escape(String(row[key as keyof typeof row] ?? ""))).join(","))].join("\r\n");
    return new NextResponse("\uFEFF" + csv, { headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": `attachment; filename="login-activity.csv"` } });
  }

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Login Activity");
    sheet.addRow([title]); sheet.addRow([`Generated ${generated}`]); sheet.addRow([]);
    sheet.addRow(columns.map(([, label]) => label));
    rows.forEach((row) => sheet.addRow(columns.map(([key]) => row[key as keyof typeof row])));
    sheet.getRow(1).font = { bold: true, size: 14 }; sheet.getRow(4).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="login-activity.xlsx"` } });
  }

  const pdfRows = rows.map((row) => Object.fromEntries(columns.map(([key, label]) => [label, row[key as keyof typeof row]])));
  const buffer = await renderReportPdf({ title, columns: columns.map(([, label]) => ({ key: label, label })), rows: pdfRows });
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="login-activity.pdf"` } });
}
