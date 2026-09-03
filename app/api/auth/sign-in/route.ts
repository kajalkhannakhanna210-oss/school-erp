import { createHmac, randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { genericAuthError, isValidIdentifier, normalizeIdentifier } from "@/lib/security/auth-inputs";
import { checkRateLimit, clearRateLimit, logSecurityEvent } from "@/lib/security/server";
import { recordLoginActivity } from "@/lib/security/login-activity";
import {
  SUPER_ADMIN_SESSION_COOKIE_NAME,
  createSuperAdminSessionToken,
  getSuperAdminSessionSecret,
  superAdminSessionCookieOptions,
} from "@/lib/security/super-admin-session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_CONTEXT_COOKIE, loginContextCookieOptions, serializeLoginContext } from "@/lib/security/login-context";
import { getTenantFromHostname, type LoginMode } from "@/lib/security/tenant-context";
import { resolveTenantFromRequest } from "@/lib/website/tenant-resolver";

export const runtime = "nodejs";

const deviceCookieName = "school_erp_device_token";
const auditCookieName = "school_erp_login_audit_token";
const rememberCookieName = "school_erp_remember_device";
const persistentMaxAgeSeconds = 60 * 60 * 24 * 365;
const rememberMaxAgeSeconds = 60 * 60 * 24 * 60;
const roleIds = ["student", "parent", "staff"] as const;
type RoleId = (typeof roleIds)[number];

function tokenSecret() {
  return process.env.REMEMBER_DEVICE_TOKEN_SECRET;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken(value: unknown, secret: string) {
  const encodedPayload = encode(JSON.stringify(value));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function isRoleId(value: unknown): value is RoleId {
  return roleIds.includes(value as RoleId);
}

export async function POST(req: NextRequest) {
  let body: { identifier?: unknown; password?: unknown; role?: unknown; adminLogin?: unknown; remember?: unknown; loginMode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const identifier = normalizeIdentifier(body.identifier);
  const password = typeof body.password === "string" ? body.password : "";
  const role = isRoleId(body.role) ? body.role : "student";
  const adminLogin = body.adminLogin === true;
  const isUnifiedLogin = req.nextUrl.pathname === "/login";
  let requestedMode = body.loginMode === "SUPER_ADMIN" || body.loginMode === "ORGANISATION" || body.loginMode === "SCHOOL" ? body.loginMode as LoginMode : (adminLogin ? "SUPER_ADMIN" : "SCHOOL");
  const remember = body.remember === true;

  if (!isValidIdentifier(identifier) || !password) {
    await recordLoginActivity({ eventType: "failed_login", status: "failed", identifier: identifier.value || null, request: req, failureReason: "invalid_input" });
    return NextResponse.json({ error: genericAuthError }, { status: 400 });
  }

  const rateLimit = await checkRateLimit({
    action: "sign_in",
    identifier: identifier.value,
    limit: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
    request: req,
  });

  if (!rateLimit.allowed) {
    await recordLoginActivity({ eventType: "rate_limit_exceeded", status: "blocked", identifier: identifier.value, request: req, failureReason: "rate_limited" });
    await logSecurityEvent({
      eventType: "sign_in_rate_limited",
      identifier: identifier.value,
      request: req,
      metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const supabase = await createClient();
  const resolvedSchool = requestedMode === "SCHOOL" ? await resolveTenantFromRequest() : null;
  let tenant = requestedMode === "SUPER_ADMIN" ? { loginMode: "SUPER_ADMIN" as const, organisationId: null, schoolId: null } : resolvedSchool ? { loginMode: "SCHOOL" as const, organisationId: resolvedSchool.organizationId, schoolId: resolvedSchool.schoolId } : await getTenantFromHostname();
  // Do not reject a platform administrator before authenticating. A super
  // admin has no organisation/school tenant and may use the regular /login
  // page, whose default mode is SCHOOL.
  if (requestedMode !== "SUPER_ADMIN" && tenant && (tenant.loginMode !== requestedMode || !tenant.organisationId || (requestedMode === "SCHOOL" && !tenant.schoolId))) {
    return NextResponse.json({ error: "This login is not available for the current organisation or school." }, { status: 403 });
  }
  let authEmail = identifier.kind === "phone" ? null : identifier.value;
  if (!authEmail) {
    let usernameQuery = createAdminClient().from("profiles").select("id").eq("username", identifier.value).eq("is_active", true);
    if (requestedMode === "ORGANISATION" && tenant?.organisationId) usernameQuery = usernameQuery.eq("organization_id", tenant.organisationId).is("school_id", null);
    if (requestedMode === "SCHOOL" && tenant?.organisationId && tenant.schoolId) usernameQuery = usernameQuery.eq("organization_id", tenant.organisationId).eq("school_id", tenant.schoolId);
    const { data: usernameProfile } = await usernameQuery.maybeSingle();
    if (usernameProfile?.id) {
      const { data: authRecord } = await createAdminClient().auth.admin.getUserById(usernameProfile.id);
      authEmail = authRecord.user?.email ?? null;
    }
    if (!authEmail && requestedMode !== "SUPER_ADMIN" && !tenant) {
      const { data: platformProfile } = await createAdminClient().from("profiles").select("id").eq("username", identifier.value).eq("user_type", "SUPER_ADMIN").eq("is_active", true).maybeSingle();
      if (platformProfile?.id) {
        const { data: authRecord } = await createAdminClient().auth.admin.getUserById(platformProfile.id);
        authEmail = authRecord.user?.email ?? null;
      }
    }
  }
  if (!authEmail && identifier.kind !== "phone") return NextResponse.json({ error: genericAuthError }, { status: 401 });
  const credentials =
    identifier.kind === "phone" && !authEmail
      ? { phone: identifier.value, password }
      : { email: authEmail!, password };
  const { data, error: signInError } = await supabase.auth.signInWithPassword(credentials);


  if (signInError || !data.user) {
    await recordLoginActivity({ eventType: "failed_login", status: "failed", identifier: identifier.value, request: req, failureReason: "invalid_credentials" });
    await logSecurityEvent({ eventType: "sign_in_failed", identifier: identifier.value, request: req });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  let { data: profile } = await supabase.from("profiles").select("role, user_type, platform_role, organization_id, school_id, is_active").eq("id", data.user.id).maybeSingle();
  const { data: userRoles } = await supabase.from("profile_roles").select("role").eq("profile_id", data.user.id);

  // Auth has already verified the credentials. If profile RLS prevents the
  // signed-in user from reading their own role, use the trusted server client
  // for this role lookup so Super Admin login is not incorrectly rejected.
  if (!profile?.role) {
    const { data: adminProfile } = await createAdminClient()
      .from("profiles")
      .select("role, user_type, platform_role, organization_id, school_id, is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    profile = adminProfile;
  }

  if (!profile?.role || profile.is_active === false) {
    await supabase.auth.signOut();
    await logSecurityEvent({ eventType: "sign_in_missing_profile", userId: data.user.id, identifier: identifier.value, request: req });
    await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "missing_profile" });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  const userType = profile.user_type ?? (profile.role === "super_admin" ? "SUPER_ADMIN" : profile.school_id ? "SCHOOL_USER" : profile.organization_id ? "ORGANISATION_USER" : null);
  const isSuperAdmin = userType === "SUPER_ADMIN" && (profile.platform_role === "SUPER_ADMIN" || profile.role === "super_admin");
  // The root /login page is the unified entry point. Once Supabase verifies
  // the password, infer the user's scope from the trusted profile record.
  if (isUnifiedLogin && !isSuperAdmin) {
    requestedMode = profile.school_id ? "SCHOOL" : "ORGANISATION";
    tenant = profile.organization_id
      ? { loginMode: requestedMode, organisationId: profile.organization_id, schoolId: profile.school_id ?? null }
      : null;
  }
  if (requestedMode === "SUPER_ADMIN" && !isSuperAdmin) {
    await supabase.auth.signOut();
    await logSecurityEvent({ eventType: "admin_sign_in_role_denied", userId: data.user.id, identifier: identifier.value, request: req });
    await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "admin_role_required" });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  if (requestedMode !== "SUPER_ADMIN" && !isSuperAdmin) {
    if (!tenant?.organisationId || (requestedMode === "SCHOOL" && !tenant.schoolId)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This login is not available for the current organisation or school." }, { status: 403 });
    }
    const { data: memberships } = await createAdminClient().from("organization_memberships").select("organization_id, school_id, membership_role").eq("profile_id", data.user.id).eq("organization_id", tenant.organisationId).eq("is_active", true);
    const orgMatch = profile.organization_id === tenant.organisationId || (memberships ?? []).length > 0;
    const schoolMatch = profile.school_id === tenant.schoolId || (memberships ?? []).some((m) => m.school_id === tenant.schoolId || (requestedMode === "SCHOOL" && m.school_id === null));
    const roleMatch = requestedMode === "ORGANISATION" ? userType === "ORGANISATION_USER" || (memberships ?? []).some((m) => m.membership_role === "organization_admin") : userType === "SCHOOL_USER" || schoolMatch;
    if (!orgMatch || !roleMatch || (requestedMode === "SCHOOL" && !schoolMatch)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: genericAuthError }, { status: 401 });
    }
    const assignedRoles = new Set<string>([profile.role, ...(userRoles ?? []).map((row: { role: string }) => row.role)]);
    if (profile.role === "super_admin" && role === "staff") assignedRoles.add("staff");

    // Super admins use the normal /login page and should not be rejected just
    // because the role tabs default to Student or Staff after a refresh.
    if (!isUnifiedLogin && !isSuperAdmin && profile.role !== "super_admin" && !assignedRoles.has(role) && role !== "staff") {
      await supabase.auth.signOut();
      await logSecurityEvent({ eventType: "sign_in_role_denied", userId: data.user.id, identifier: identifier.value, request: req, metadata: { role } });
      await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "role_not_assigned", metadata: { requestedRole: role } });
      return NextResponse.json({ error: genericAuthError }, { status: 401 });
    }

    if (profile.role !== "super_admin" && profile.role !== role) {
      await supabase.rpc("set_my_active_role", { next_role: role });
    }
  }

  const isSuperAdminSession = isSuperAdmin;
  const superAdminSessionSecret = getSuperAdminSessionSecret();
  if (isSuperAdminSession && !superAdminSessionSecret) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Secure super-admin sessions are not configured. Set SUPER_ADMIN_SESSION_SECRET and try again." },
      { status: 500 }
    );
  }

  await clearRateLimit("sign_in", identifier.value, req);

  const admin = createAdminClient();
  const [{ data: staffRecord }, { data: memberships }] = await Promise.all([
    admin.from("staff").select("organization_id, primary_school_id").eq("id", data.user.id).maybeSingle(),
    admin.from("organization_memberships").select("organization_id, school_id, membership_role").eq("profile_id", data.user.id).eq("is_active", true),
  ]);
  const organizationId = isSuperAdmin ? null : tenant?.organisationId ?? null;
  const needsContextSelection = false;
  const response = NextResponse.json({ ok: true, contextRequired: false, loginMode: requestedMode });
  if (isSuperAdminSession && superAdminSessionSecret) {
    response.cookies.set(
      SUPER_ADMIN_SESSION_COOKIE_NAME,
      await createSuperAdminSessionToken(data.user.id, superAdminSessionSecret),
      superAdminSessionCookieOptions()
    );
  } else {
    response.cookies.set(SUPER_ADMIN_SESSION_COOKIE_NAME, "", superAdminSessionCookieOptions(0));
  }
  response.cookies.set(LOGIN_CONTEXT_COOKIE, serializeLoginContext({ userId: data.user.id, organizationId, schoolId: isSuperAdmin ? null : tenant?.schoolId ?? null, loginScope: isSuperAdmin ? "super_admin" : requestedMode === "ORGANISATION" ? "organization" : "school" }), loginContextCookieOptions());
  const secret = tokenSecret();
  if (secret) {
    const deviceId = randomUUID();
    response.cookies.set(deviceCookieName, createToken({ value: deviceId }, secret), cookieOptions(persistentMaxAgeSeconds));

    const { data: audit } = await createAdminClient()
      .from("login_audit")
      .insert({ user_id: data.user.id, login_identifier: identifier.value, device_id: deviceId })
      .select("id")
      .single();

    if (audit?.id) {
      response.cookies.set(auditCookieName, createToken({ value: audit.id }, secret), cookieOptions(persistentMaxAgeSeconds));
    }

    if (remember) {
      response.cookies.set(
        rememberCookieName,
        createToken({ identifier: identifier.displayValue, role, exp: Date.now() + rememberMaxAgeSeconds * 1000 }, secret),
        cookieOptions(rememberMaxAgeSeconds)
      );
    } else {
      response.cookies.set(rememberCookieName, "", cookieOptions(0));
    }
  }

  await logSecurityEvent({ eventType: "sign_in_success", userId: data.user.id, identifier: identifier.value, request: req });
  await recordLoginActivity({ eventType: "successful_login", status: "success", userId: data.user.id, identifier: identifier.value, request: req, authenticationMethod: "password" });
  return response;
}
