import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAccessLog, inferModuleAndPage } from "@/lib/security/access-logs";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userName: string | null = null;
    let email: string | null = null;
    let role: UserRole | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      userName = profile?.full_name ?? user.email ?? null;
      email = user.email ?? null;
      role = (profile?.role as UserRole) ?? null;
    } else {
      userName = "Public / Guest Visitor";
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = "Action",
      resource = req.nextUrl.pathname,
      module,
      page,
      requestMethod = "POST",
      statusCode = 200,
      responseTimeMs = 80,
      outcome,
      sessionReference,
      requestId,
    } = body;

    const inferred = inferModuleAndPage(resource);

    await recordAccessLog({
      userId: user?.id ?? null,
      userName,
      email,
      role,
      module: module ?? inferred.module,
      page: page ?? inferred.page,
      resource,
      requestMethod,
      action,
      statusCode: Number(statusCode) || 200,
      request: req,
      responseTimeMs: Number(responseTimeMs) || 80,
      sessionReference,
      requestId,
      outcome: outcome ?? `${action} performed on ${page ?? inferred.page}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn("Failed to record client audit action", error);
    return NextResponse.json({ error: "Failed to record client action" }, { status: 500 });
  }
}
