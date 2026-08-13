import { type NextRequest } from "next/server";
import { handleAdmissionSubmission } from "@/lib/security/public-form-handlers";
import { logSecurityEvent } from "@/lib/security/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleAdmissionSubmission({
    request: req,
    body: await req.json().catch(() => null),
    createAdminClient,
    createAuthClient: createClient,
    logSecurityEvent,
  });
}
