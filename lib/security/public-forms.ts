import type { NextRequest } from "next/server";
import {
  normalizedContentHash,
  isHoneypotFilled,
  validateAdmissionPayload,
  validateContactPayload,
} from "./public-forms-core";
import { checkRateLimitKey, getClientIp, hashIp } from "./server";

export const formRateLimit = {
  limit: 3,
  windowSeconds: 10 * 60,
  blockSeconds: 10 * 60,
};

export { normalizedContentHash, validateAdmissionPayload, validateContactPayload, isHoneypotFilled };

type TurnstileResult = { ok: true } | { ok: false; error: string };


export function isSameOriginRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === req.nextUrl.origin;
}

export async function verifyTurnstileToken(token: string, req: NextRequest): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Bot protection is not configured." };
  if (!token || token.length > 4096) return { ok: false, error: "Please complete the security check." };

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);
  const ip = getClientIp(req);
  if (ip !== "unknown") formData.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success ? { ok: true } : { ok: false, error: "Please complete the security check." };
  } catch {
    return { ok: false, error: "We could not verify the security check. Please try again." };
  }
}

export async function checkPublicFormRateLimits(formName: string, email: string, req: NextRequest) {
  const ip = getClientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimitKey({ action: `${formName}_submission_ip`, scope: `ip:${ip}`, ...formRateLimit, failOpen: false }),
    checkRateLimitKey({ action: `${formName}_submission_email`, scope: `email:${email}`, ...formRateLimit, failOpen: false }),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function requestIpHash(req: NextRequest) {
  return hashIp(getClientIp(req));
}
