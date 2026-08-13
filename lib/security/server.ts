import { createHash, createHmac } from "crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { createAdminClient } from "../supabase/admin";

type RateLimitInput = {
  action: string;
  identifier?: string;
  limit: number;
  windowSeconds: number;
  blockSeconds: number;
  request?: NextRequest;
};

type ScopedRateLimitInput = {
  action: string;
  scope: string;
  limit: number;
  windowSeconds: number;
  blockSeconds: number;
  failOpen?: boolean;
};

type SecurityEventInput = {
  eventType: string;
  userId?: string | null;
  identifier?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
};

function secret() {
  return process.env.RATE_LIMIT_SECRET ?? process.env.REMEMBER_DEVICE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function hmac(value: string) {
  const key = secret();
  if (!key) return createHash("sha256").update(value).digest("hex");
  return createHmac("sha256", key).update(value).digest("hex");
}

function headerValue(name: string, request?: NextRequest) {
  if (request) return request.headers.get(name);
  try {
    return headers().get(name);
  } catch {
    return null;
  }
}

export function getClientIp(request?: NextRequest) {
  const forwardedFor = headerValue("x-vercel-forwarded-for", request) ?? headerValue("x-forwarded-for", request);
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return headerValue("x-real-ip", request) ?? "unknown";
}

export function getUserAgent(request?: NextRequest) {
  return headerValue("user-agent", request) ?? null;
}

export function hashIdentifier(identifier?: string | null) {
  return identifier ? hmac(identifier.trim().toLowerCase()) : null;
}

export function hashIp(ip?: string | null) {
  return ip ? hmac(ip) : null;
}

export async function checkRateLimit(input: RateLimitInput) {
  const ip = getClientIp(input.request);
  const identifierPart = input.identifier ? input.identifier.trim().toLowerCase() : "anonymous";
  return checkRateLimitKey({
    action: input.action,
    scope: `${ip}:${identifierPart}`,
    limit: input.limit,
    windowSeconds: input.windowSeconds,
    blockSeconds: input.blockSeconds,
  });
}

export async function checkRateLimitKey(input: ScopedRateLimitInput) {
  const key = hmac(`${input.action}:${input.scope}`);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_action: input.action,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
    p_block_seconds: input.blockSeconds,
  });

  if (error) {
    console.warn("Auth rate-limit check failed", { action: input.action, code: error.code });
    return { allowed: input.failOpen ?? true, retryAfterSeconds: input.failOpen === false ? input.blockSeconds : 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}

export async function clearRateLimit(action: string, identifier: string, request?: NextRequest) {
  const ip = getClientIp(request);
  const key = hmac(`${action}:${ip}:${identifier.trim().toLowerCase()}`);
  const { error } = await createAdminClient().from("auth_rate_limits").delete().eq("key", key);
  if (error) console.warn("Auth rate-limit clear failed", { action, code: error.code });
}

export async function logSecurityEvent(input: SecurityEventInput) {
  const ip = getClientIp(input.request);
  const userAgent = getUserAgent(input.request);
  const { error } = await createAdminClient().from("auth_security_events").insert({
    event_type: input.eventType,
    user_id: input.userId ?? null,
    identifier_hash: hashIdentifier(input.identifier),
    ip_hash: hashIp(ip),
    user_agent: userAgent ? userAgent.slice(0, 300) : null,
    metadata: input.metadata ?? {},
  });
  if (error) console.warn("Security event log failed", { eventType: input.eventType, code: error.code });
}
