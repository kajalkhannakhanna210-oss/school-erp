export const SUPER_ADMIN_SESSION_COOKIE_NAME = "school_erp_super_admin_session";
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

type SuperAdminSessionPayload = {
  userId: string;
  exp: number;
};

export type SuperAdminSessionValidation = "valid" | "missing" | "invalid" | "expired";

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function signaturesMatch(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export function getSuperAdminSessionSecret() {
  // The dedicated secret is preferred. The fallbacks let existing deployments
  // enforce the cap immediately when they already use a server-only secret.
  return process.env.SUPER_ADMIN_SESSION_SECRET
    ?? process.env.REMEMBER_DEVICE_TOKEN_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? null;
}

export async function createSuperAdminSessionToken(
  userId: string,
  secret: string,
  now = Date.now()
) {
  const payload: SuperAdminSessionPayload = {
    userId,
    exp: now + SUPER_ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encodedPayload}.${await sign(encodedPayload, secret)}`;
}

export async function validateSuperAdminSessionToken(
  token: string | undefined,
  userId: string,
  secret: string | null,
  now = Date.now()
): Promise<SuperAdminSessionValidation> {
  if (!token) return "missing";
  if (!secret) return "invalid";

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return "invalid";

  const [encodedPayload, signature] = parts;
  const expectedSignature = await sign(encodedPayload, secret);
  if (!signaturesMatch(signature, expectedSignature)) return "invalid";

  let payload: Partial<SuperAdminSessionPayload>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Partial<SuperAdminSessionPayload>;
  } catch {
    return "invalid";
  }

  if (payload.userId !== userId || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return "invalid";
  }

  return payload.exp <= now ? "expired" : "valid";
}

export function superAdminSessionCookieOptions(maxAge = SUPER_ADMIN_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
