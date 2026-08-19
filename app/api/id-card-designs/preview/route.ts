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

  // Only allow paths inside the id-card-designs bucket
  // Accept either: full path like "id-card-designs/<id>/<file>" or just "<id>/<file>"
  let internalPath = fileParam;
  if (fileParam.startsWith("id-card-designs/")) {
    internalPath = fileParam.replace(/^id-card-designs\//, "");
  }
  if (!internalPath || internalPath.includes("..")) return error("Invalid file path.", 400);

  try {
    await requirePageAccess("student_id_cards");
  } catch (e) {
    return error("Not authorized.", 403);
  }

  const admin = createAdminClient();
  try {
    // Create a short-lived signed URL (60s)
    // @ts-ignore
    const { data, error } = await admin.storage.from("id-card-designs").createSignedUrl(internalPath, 60);
    if (error || !data?.signedUrl) {
      return error("Could not generate preview URL.", 500);
    }
    return NextResponse.redirect(data.signedUrl);
  } catch (e: any) {
    return error(`Preview failed: ${String(e?.message || e)}`, 500);
  }
}
