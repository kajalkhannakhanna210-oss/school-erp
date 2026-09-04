import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_CONTEXT_COOKIE, loginContextCookieOptions, serializeLoginContext } from "@/lib/security/login-context";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { organizationId?: unknown; schoolId?: unknown };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
  if (!organizationId || !schoolId) return NextResponse.json({ error: "Select an organization and school." }, { status: 400 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, user_type").eq("id", auth.user.id).maybeSingle();
  if (!profile?.role) return NextResponse.json({ error: "No active profile was found." }, { status: 403 });
  const { data: school } = await admin.from("schools").select("id, organization_id").eq("id", schoolId).eq("organization_id", organizationId).eq("is_active", true).maybeSingle();
  if (!school) return NextResponse.json({ error: "That school is not part of the selected organization." }, { status: 403 });
  if (profile.role !== "super_admin") {
    const [{ data: staff }, { data: memberships }, { data: scopes }] = await Promise.all([
      admin.from("staff").select("organization_id").eq("id", auth.user.id).maybeSingle(),
      admin.from("organization_memberships").select("organization_id, school_id, membership_role").eq("profile_id", auth.user.id).eq("organization_id", organizationId).eq("is_active", true),
      admin.from("staff_module_scopes").select("scope_type, resource_id").eq("staff_id", auth.user.id).eq("module_key", "school_access").eq("action_key", "ALL"),
    ]);
    const belongsToOrganization = staff?.organization_id === organizationId || (memberships ?? []).length > 0;
    const allSchools = (memberships ?? []).some((m) => m.school_id === null) || (scopes ?? []).some((s) => s.scope_type === "ALL");
    const authorized = allSchools || (scopes ?? []).some((s) => s.scope_type === "SCHOOL" && s.resource_id === schoolId) || (memberships ?? []).some((m) => m.school_id === schoolId);
    if (!belongsToOrganization || !authorized) return NextResponse.json({ error: "You are not authorized for that school." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  const loginScope = profile.role === "super_admin"
    ? "super_admin"
    : profile.user_type === "ORGANISATION_USER" || profile.role === "organization_admin"
      ? "organization"
      : "school";
  response.cookies.set(LOGIN_CONTEXT_COOKIE, serializeLoginContext({ userId: auth.user.id, organizationId, schoolId, loginScope }), loginContextCookieOptions());
  return response;
}
