import { NextResponse, type NextRequest } from "next/server";
import { genericResetMessage, isValidEmail } from "@/lib/security/auth-inputs";
import { checkRateLimit, logSecurityEvent } from "@/lib/security/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: genericResetMessage }, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const identifier = isValidEmail(email) ? email : "invalid";
  const rateLimit = await checkRateLimit({
    action: "password_reset",
    identifier,
    limit: 3,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
    request: req,
  });

  if (!rateLimit.allowed) {
    await logSecurityEvent({
      eventType: "password_reset_rate_limited",
      identifier,
      request: req,
      metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    return NextResponse.json(
      { message: "Too many reset requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (isValidEmail(email)) {
    const origin = req.nextUrl.origin;
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/profile`,
    });
    await logSecurityEvent({
      eventType: error ? "password_reset_failed" : "password_reset_requested",
      identifier: email,
      request: req,
      metadata: error ? { code: error.code } : {},
    });
  }

  return NextResponse.json({ message: genericResetMessage });
}
