import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const LOGIN_CONTEXT_COOKIE = "erp_login_context";
export type LoginScope = "school" | "organization";
export type LoginContext = { userId: string; organizationId: string; schoolId: string | null; loginScope: LoginScope };

function secret() {
  return process.env.SUPER_ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

function encode(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function decode(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export function serializeLoginContext(context: LoginContext) {
  const payload = encode(JSON.stringify(context));
  return `${payload}.${sign(payload)}`;
}

export function parseLoginContext(value: string | undefined): LoginContext | null {
  if (!value || !secret()) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(decode(payload)) as LoginContext;
    return parsed?.userId && parsed?.organizationId && (parsed.schoolId === null || typeof parsed.schoolId === "string") && (parsed.loginScope === "school" || parsed.loginScope === "organization") ? parsed : null;
  } catch { return null; }
}

export async function getLoginContext() {
  const store = await cookies();
  return parseLoginContext(store.get(LOGIN_CONTEXT_COOKIE)?.value);
}

export function loginContextCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}
