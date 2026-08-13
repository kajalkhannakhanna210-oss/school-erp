import { createHmac, randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { genericAuthError, isValidIdentifier, normalizeIdentifier } from "@/lib/security/auth-inputs";
import { checkRateLimit, clearRateLimit, logSecurityEvent } from "@/lib/security/server";
import { recordLoginActivity } from "@/lib/security/login-activity";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  let body: { identifier?: unknown; password?: unknown; role?: unknown; adminLogin?: unknown; remember?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const identifier = normalizeIdentifier(body.identifier);
  const password = typeof body.password === "string" ? body.password : "";
  const role = isRoleId(body.role) ? body.role : "student";
  const adminLogin = body.adminLogin === true;
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
  const credentials =
    identifier.kind === "phone"
      ? { phone: identifier.value, password }
      : { email: identifier.value, password };
  const { data, error: signInError } = await supabase.auth.signInWithPassword(credentials);

  if (signInError || !data.user) {
    await recordLoginActivity({ eventType: "failed_login", status: "failed", identifier: identifier.value, request: req, failureReason: "invalid_credentials" });
    await logSecurityEvent({ eventType: "sign_in_failed", identifier: identifier.value, request: req });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  const [{ data: profile }, { data: userRoles }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle(),
    supabase.from("profile_roles").select("role").eq("profile_id", data.user.id),
  ]);

  if (!profile?.role) {
    await supabase.auth.signOut();
    await logSecurityEvent({ eventType: "sign_in_missing_profile", userId: data.user.id, identifier: identifier.value, request: req });
    await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "missing_profile" });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  if (adminLogin && profile.role !== "super_admin") {
    await supabase.auth.signOut();
    await logSecurityEvent({ eventType: "admin_sign_in_role_denied", userId: data.user.id, identifier: identifier.value, request: req });
    await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "admin_role_required" });
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  if (!adminLogin) {
    const assignedRoles = new Set<string>([profile.role, ...(userRoles ?? []).map((row: { role: string }) => row.role)]);
    if (profile.role === "super_admin" && role === "staff") assignedRoles.add("staff");

    if (!assignedRoles.has(role)) {
      await supabase.auth.signOut();
      await logSecurityEvent({ eventType: "sign_in_role_denied", userId: data.user.id, identifier: identifier.value, request: req, metadata: { role } });
      await recordLoginActivity({ eventType: "role_access_denied", status: "blocked", userId: data.user.id, identifier: identifier.value, request: req, failureReason: "role_not_assigned", metadata: { requestedRole: role } });
      return NextResponse.json({ error: genericAuthError }, { status: 401 });
    }

    if (profile.role !== role) {
      await supabase.rpc("set_my_active_role", { next_role: role });
    }
  }

  await clearRateLimit("sign_in", identifier.value, req);

  const response = NextResponse.json({ ok: true });
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
