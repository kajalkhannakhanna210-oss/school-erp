import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/security/authorization";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { IMPERSONATION_COOKIE, serializeImpersonation } from "@/lib/security/impersonation";
import { recordLoginActivity } from "@/lib/security/login-activity";
import { recordServerAction } from "@/lib/security/access-logs";

async function authorize() {
  const current = await getCurrentUser();
  if (!current || !["SUPER_ADMIN", "ORGANISATION_USER"].includes(current.userType)) return null;
  return current;
}

export async function GET(request: Request) {
  const current = await authorize();
  if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url); const schoolId = url.searchParams.get("schoolId") ?? ""; const type = url.searchParams.get("type") === "student" ? "student" : "staff"; const q = (url.searchParams.get("q") ?? "").trim();
  const context = await getMasterDataContext(); const school = context.schools.find((item) => item.id === schoolId);
  if (!school) return NextResponse.json({ error: "Select an authorized school." }, { status: 403 });
  const admin = createAdminClient();
  if (type === "staff") {
    let query = admin.from("staff").select("id, employee_id, department, designation, mobile_number, contact_email, profiles!staff_id_fkey(full_name)").eq("organization_id", school.organization_id).eq("primary_school_id", school.id).eq("is_active", true).order("employee_id").limit(50);
    if (q) query = query.or(`employee_id.ilike.%${q}%,department.ilike.%${q}%,designation.ilike.%${q}%`);
    const { data, error } = await query; if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const users = (data ?? []).filter((row: any) => !q || `${row.profiles?.full_name ?? ""} ${row.employee_id} ${row.contact_email ?? ""} ${row.mobile_number ?? ""} ${row.department ?? ""} ${row.designation ?? ""}`.toLowerCase().includes(q.toLowerCase())).map((row: any) => ({ id: row.id, name: row.profiles?.full_name ?? "Unnamed faculty", identifier: row.employee_id, role: "staff", detail: [row.designation, row.department].filter(Boolean).join(" · ") || "Faculty member", schoolName: school.name }));
    await recordServerAction({ action: "Search Faculty for Login As", resource: "/login-as", module: "Security", page: "Login As User", userId: current.authUser.id, outcome: `Searched faculty for ${school.name}` });
    return NextResponse.json({ users });
  }
  const { data, error } = await admin.from("students").select("id, admission_number, roll_number, profiles!students_id_fkey(full_name), classes!inner(name, school_id), sections(name)").eq("classes.school_id", school.id).eq("is_active", true).order("admission_number").limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const users = (data ?? []).filter((row: any) => !q || `${row.profiles?.full_name ?? ""} ${row.admission_number} ${row.roll_number ?? ""} ${row.classes?.name ?? ""} ${row.sections?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())).map((row: any) => ({ id: row.id, name: row.profiles?.full_name ?? "Unnamed student", identifier: row.admission_number, role: "student", detail: `Class ${row.classes?.name ?? "—"}${row.sections?.name ? ` · ${row.sections.name}` : ""}${row.roll_number ? ` · Roll no. ${row.roll_number}` : ""}`, schoolName: school.name }));
  await recordServerAction({ action: "Search Students for Login As", resource: "/login-as", module: "Security", page: "Login As User", userId: current.authUser.id, outcome: `Searched students for ${school.name}` });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const current = await authorize(); if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const targetRole = body.targetRole === "student" ? "student" : body.targetRole === "staff" ? "staff" : null; const targetId = typeof body.targetId === "string" ? body.targetId : ""; const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
  const context = await getMasterDataContext(); const school = context.schools.find((item) => item.id === schoolId); if (!targetRole || !targetId || !school) return NextResponse.json({ error: "Invalid user or school selection." }, { status: 400 });
  const admin = createAdminClient(); const table = targetRole === "staff" ? "staff" : "students"; const targetSelect = targetRole === "staff" ? "id, profiles!staff_id_fkey(full_name)" : "id, profiles!students_id_fkey(full_name)"; const { data: target } = await admin.from(table).select(targetSelect).eq("id", targetId).maybeSingle(); if (!target) return NextResponse.json({ error: "Target user was not found." }, { status: 404 });
  const scoped = targetRole === "staff"
    ? await admin.from("staff").select("id").eq("id", targetId).eq("organization_id", school.organization_id).eq("primary_school_id", school.id).eq("is_active", true).maybeSingle()
    : await admin.from("students").select("id, classes!inner(school_id)").eq("id", targetId).eq("classes.school_id", school.id).eq("is_active", true).maybeSingle();
  if (!scoped.data) return NextResponse.json({ error: "That user is not assigned to the selected school." }, { status: 403 });
  const name = (target as any).profiles?.full_name ?? "User"; const now = new Date().toISOString(); await admin.from("impersonation_audit_logs").insert({ admin_user_id: current.authUser.id, admin_role: current.profile.role, organization_id: school.organization_id, school_id: school.id, target_user_id: targetId, target_user_role: targetRole, started_at: now, status: "IMPERSONATION_STARTED" });
  await Promise.all([
    recordServerAction({ action: "Start Login As", resource: "/login-as", module: "Security", page: "Login As User", userId: current.authUser.id, outcome: `Started Login As ${name} (${targetRole}) at ${school.name}` }),
    recordLoginActivity({ eventType: "successful_login", status: "success", userId: targetId, authenticationMethod: "admin_impersonation", metadata: { admin_user_id: current.authUser.id, school_id: school.id, target_role: targetRole } }),
  ]);
  const response = NextResponse.json({ ok: true }); response.cookies.set(IMPERSONATION_COOKIE, serializeImpersonation({ actorId: current.authUser.id, targetId, targetRole, schoolId: school.id, targetName: name, schoolName: school.name, startedAt: now }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 }); return response;
}

export async function DELETE() {
  const current = await authorize();
  if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  const admin = createAdminClient();
  await admin.from("impersonation_audit_logs").update({ ended_at: new Date().toISOString(), status: "IMPERSONATION_ENDED" }).eq("admin_user_id", current.authUser.id).is("ended_at", null);
  await Promise.all([
    recordServerAction({ action: "End Login As", resource: "/login-as", module: "Security", page: "Login As User", userId: current.authUser.id, outcome: "Returned to admin session" }),
    recordLoginActivity({ eventType: "logout", status: "success", userId: current.authUser.id, authenticationMethod: "admin_impersonation", metadata: { event: "IMPERSONATION_ENDED" } }),
  ]);
  return response;
}
