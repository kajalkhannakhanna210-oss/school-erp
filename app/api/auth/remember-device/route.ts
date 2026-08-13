import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const cookieName = "school_erp_remember_device";
const maxAgeSeconds = 60 * 60 * 24 * 60;
const roleIds = ["student", "parent", "staff"] as const;
type RoleId = (typeof roleIds)[number];

type RememberDevicePayload = {
  identifier: string;
  role: RoleId;
  exp: number;
};

function tokenSecret() {
  return process.env.REMEMBER_DEVICE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function isRoleId(value: unknown): value is RoleId {
  return roleIds.includes(value as RoleId);
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

function createToken(payload: RememberDevicePayload, secret: string) {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function verifyToken(token: string, secret: string): RememberDevicePayload | null {
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

  let payload: Partial<RememberDevicePayload>;
  try {
    payload = JSON.parse(decode(encodedPayload)) as Partial<RememberDevicePayload>;
  } catch {
    return null;
  }
  if (
    typeof payload.identifier !== "string" ||
    !isRoleId(payload.role) ||
    typeof payload.exp !== "number" ||
    payload.exp < Date.now()
  ) {
    return null;
  }

  return payload as RememberDevicePayload;
}

function clearRememberCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function setRememberCookie(response: NextResponse, token: string) {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function GET(req: NextRequest) {
  const secret = tokenSecret();
  const token = req.cookies.get(cookieName)?.value;
  const response = NextResponse.json(
    { remembered: false, identifier: null, role: null },
    { headers: { "Cache-Control": "no-store" } }
  );

  if (!secret || !token) return response;

  try {
    const payload = verifyToken(token, secret);
    if (!payload) {
      clearRememberCookie(response);
      return response;
    }

    return NextResponse.json(
      { remembered: true, identifier: payload.identifier, role: payload.role },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    clearRememberCookie(response);
    return response;
  }
}

export async function POST(req: NextRequest) {
  const secret = tokenSecret();
  if (!secret) {
    return NextResponse.json({ error: "Remember-device token secret is not configured." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as { identifier?: unknown; role?: unknown };
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const role = isRoleId(body.role) ? body.role : "student";

  if (!identifier) {
    return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
  }

  const token = createToken(
    {
      identifier,
      role,
      exp: Date.now() + maxAgeSeconds * 1000,
    },
    secret
  );
  const response = NextResponse.json({ remembered: true });
  setRememberCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ remembered: false });
  clearRememberCookie(response);
  return response;
}
