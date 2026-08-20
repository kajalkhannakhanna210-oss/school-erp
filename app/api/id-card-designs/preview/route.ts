import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");

  if (!fileParam) {
    return error("Missing file parameter.", 400);
  }

  // Prevent path traversal attacks.
  if (fileParam.includes("..")) {
    return error("Invalid file path.", 400);
  }

  // Require permission to access Student ID Card designs.
  try {
    await requirePageAccess("student_id_cards");
  } catch {
    return error("Not authorized.", 403);
  }

  try {
    const admin = createAdminClient();

    // Support both:
    // 1. bucket-relative path:
    //    <id>/<filename>
    //
    // 2. legacy path:
    //    id-card-designs/<id>/<filename>
    const candidates = Array.from(
      new Set([
        fileParam,
        fileParam.replace(/^id-card-designs\//, ""),
      ])
    );

    for (const candidate of candidates) {
      const {
        data,
        error: storageError,
      } = await admin.storage
        .from("id-card-designs")
        .createSignedUrl(candidate, 60);

      if (!storageError && data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl);
      }
    }

    return error("Could not generate preview URL.", 500);
  } catch (e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : String(e);

    return error(
      `Preview failed: ${message}`,
      500
    );
  }
}