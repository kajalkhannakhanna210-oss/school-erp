import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const IMPERSONATION_COOKIE = "erp_impersonation";
export type Impersonation = { actorId: string; targetId: string; targetRole: "staff" | "student"; schoolId: string; targetName: string; schoolName: string; startedAt: string };
function secret() { return process.env.SUPER_ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""; }
function encode(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function serializeImpersonation(value: Impersonation) { const payload = encode(JSON.stringify(value)); return `${payload}.${sign(payload)}`; }
export function parseImpersonation(value?: string): Impersonation | null {
  if (!value || !secret()) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Impersonation;
    return parsed.actorId && parsed.targetId && parsed.schoolId && (parsed.targetRole === "staff" || parsed.targetRole === "student") ? parsed : null;
  } catch { return null; }
}
export async function getImpersonation() { return parseImpersonation((await cookies()).get(IMPERSONATION_COOKIE)?.value); }
