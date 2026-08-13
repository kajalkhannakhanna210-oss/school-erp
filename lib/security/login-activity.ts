import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

export type LoginActivityEvent =
  | "successful_login" | "failed_login" | "invalid_password" | "nonexistent_user"
  | "logout" | "account_locked" | "account_unlocked" | "password_reset_requested"
  | "password_reset_successful" | "password_changed" | "session_expired"
  | "session_revoked" | "new_device_login" | "suspicious_login_attempt"
  | "rate_limit_exceeded" | "unauthorized_access_attempt" | "role_access_denied";

type ActivityInput = {
  eventType: LoginActivityEvent;
  status: "success" | "failed" | "blocked";
  userId?: string | null;
  identifier?: string | null;
  request?: NextRequest;
  failureReason?: string | null;
  authenticationMethod?: string | null;
  sessionId?: string | null;
  loginAt?: string | null;
  logoutAt?: string | null;
  metadata?: Record<string, unknown>;
};

function parseUserAgent(userAgent: string | null) {
  const browser = userAgent?.match(/(Edg|Chrome|Firefox|Safari|Opera)\/?([\d.]+)/i);
  const operatingSystem = userAgent?.match(/(Windows NT|Mac OS X|Android|iPhone OS|Linux)[\s\d._-]*/i);
  const deviceType = /mobile|android|iphone|ipad/i.test(userAgent ?? "") ? "Mobile" : "Desktop";
  return {
    browser: browser ? `${browser[1]} ${browser[2]}` : null,
    operatingSystem: operatingSystem?.[0]?.replace(/_/g, ".") ?? null,
    deviceType,
  };
}

function clientIp(request?: NextRequest) {
  return request?.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request?.headers.get("x-real-ip")
    ?? null;
}

function hash(value: string | null | undefined) {
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

export async function recordLoginActivity(input: ActivityInput) {
  try {
    const admin = createAdminClient();
    let userName: string | null = null;
    let email: string | null = input.identifier?.trim().toLowerCase() ?? null;
    let role: UserRole | null = null;

    if (input.userId) {
      const [{ data: profile }, { data: authUser }] = await Promise.all([
        admin.from("profiles").select("full_name, role").eq("id", input.userId).maybeSingle(),
        admin.auth.admin.getUserById(input.userId),
      ]);
      userName = profile?.full_name ?? null;
      role = (profile?.role as UserRole | null) ?? null;
      email = authUser.user?.email ?? email;
    }

    const userAgent = input.request?.headers.get("user-agent") ?? null;
    const device = parseUserAgent(userAgent);
    const loginAt = input.loginAt ?? (input.eventType.includes("login") ? new Date().toISOString() : null);
    const logoutAt = input.logoutAt ?? (input.eventType === "logout" ? new Date().toISOString() : null);
    const sessionDuration = loginAt && logoutAt
      ? Math.max(0, Math.floor((new Date(logoutAt).getTime() - new Date(loginAt).getTime()) / 1000))
      : null;

    await admin.from("login_activities").insert({
      user_id: input.userId ?? null,
      user_name: userName,
      email,
      role,
      event_type: input.eventType,
      status: input.status,
      ip_address: clientIp(input.request),
      browser: device.browser,
      operating_system: device.operatingSystem,
      device_type: device.deviceType,
      user_agent: userAgent?.slice(0, 500),
      authentication_method: input.authenticationMethod ?? "password",
      failure_reason: input.failureReason ?? null,
      session_id_hash: hash(input.sessionId),
      login_at: loginAt,
      logout_at: logoutAt,
      session_duration_seconds: sessionDuration,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.warn("Login activity recording failed", error instanceof Error ? error.message : "unknown error");
  }
}
