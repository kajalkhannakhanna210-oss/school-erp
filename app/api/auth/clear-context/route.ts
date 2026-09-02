import { NextResponse } from "next/server";
import { LOGIN_CONTEXT_COOKIE, loginContextCookieOptions } from "@/lib/security/login-context";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOGIN_CONTEXT_COOKIE, "", loginContextCookieOptions(0));
  return response;
}
