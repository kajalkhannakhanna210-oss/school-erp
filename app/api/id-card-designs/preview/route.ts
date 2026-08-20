import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");
  if (!fileParam) return error("Missing file parameter.", 400);

  // Accept both the current bucket-relative path and the older
  // "id-card-designs/<id>/<file>" format.
  if (fileParam.includes("..")) return error("Invalid file path.", 400);

  try {
    await requirePageAccess("student_id_cards");
  } catch (e) {
    return error("Not authorized.", 403);
  }

  const admin = createAdminClient();
  try {
    const candidates = Array.from(new Set([
      fileParam,
      fileParam.replace(/^id-card-designs\//, ""),
    ]));
    for (const candidate of candidates) {
      const { data, error: storageError } = await admin.storage.from("id-card-designs").createSignedUrl(candidate, 60);
      if (!storageError && data?.signedUrl) return NextResponse.redirect(data.signedUrl);
    }
    return error("Could not generate preview URL.", 500);
  } catch (e: any) {
    return error(`Preview failed: ${String(e?.message || e)}`, 500);
  }
}
