import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLoginActivity } from "@/lib/security/login-activity";
import {
  SUPER_ADMIN_SESSION_COOKIE_NAME,
  superAdminSessionCookieOptions,
} from "@/lib/security/super-admin-session";

export const runtime = "nodejs";

const deviceCookieName = "school_erp_device_token";
const auditCookieName = "school_erp_login_audit_token";
const maxAgeSeconds = 60 * 60 * 24 * 365;

function tokenSecret() {
  return process.env.REMEMBER_DEVICE_TOKEN_SECRET;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken(value: string, secret: string) {
  const encodedPayload = encode(JSON.stringify({ value }));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function verifyToken(token: string | undefined, secret: string) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  let payload: { value?: unknown };
  try {
    payload = JSON.parse(decode(encodedPayload)) as { value?: unknown };
  } catch {
    return null;
  }
  return typeof payload.value === "string" && payload.value ? payload.value : null;
}

function cookieOptions(maxAge = maxAgeSeconds) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function POST(req: NextRequest) {
  const secret = tokenSecret();
  if (!secret) {
    return NextResponse.json({ error: "Login-audit token secret is not configured." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as { identifier?: unknown };
  const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
  if (!identifier) {
    return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
  }

  const deviceId = verifyToken(req.cookies.get(deviceCookieName)?.value, secret) ?? randomUUID();
  const { data: audit } = await createAdminClient()
    .from("login_audit")
    .insert({ user_id: user.id, login_identifier: identifier, device_id: deviceId })
    .select("id")
    .single();

  const response = NextResponse.json({ recorded: Boolean(audit?.id) });
  response.cookies.set(deviceCookieName, createToken(deviceId, secret), cookieOptions());

  if (audit?.id) {
    response.cookies.set(auditCookieName, createToken(audit.id, secret), cookieOptions());
  }

  return response;
}

export async function DELETE(req: NextRequest) {
  const secret = tokenSecret();
  const response = NextResponse.json({ recorded: false });
  response.cookies.set(auditCookieName, "", cookieOptions(0));
  response.cookies.set(SUPER_ADMIN_SESSION_COOKIE_NAME, "", superAdminSessionCookieOptions(0));

  if (!secret) return response;

  const auditId = verifyToken(req.cookies.get(auditCookieName)?.value, secret);
  if (!auditId) return response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return response;

  await createAdminClient()
    .from("login_audit")
    .update({ logout_at: new Date().toISOString() })
    .eq("id", auditId)
    .eq("user_id", user.id);

  await recordLoginActivity({ eventType: "logout", status: "success", userId: user.id, request: req, logoutAt: new Date().toISOString(), sessionId: auditId });

  return response;
}
