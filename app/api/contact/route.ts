import { type NextRequest } from "next/server";
import { handleContactSubmission } from "@/lib/security/public-form-handlers";
import { logSecurityEvent } from "@/lib/security/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleContactSubmission({
    request: req,
    body: await req.json().catch(() => null),
    createAdminClient,
    logSecurityEvent,
  });
}
