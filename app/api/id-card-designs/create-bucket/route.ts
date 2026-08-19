import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errResp(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    await requirePageAccess("student_id_cards");
  } catch (e) {
    return errResp("Not authorized.", 403);
  }

  const admin = createAdminClient();
  try {
    // Attempt to create the bucket; supabase-js returns { data, error }
    // @ts-ignore
    const { data, error } = await admin.storage.createBucket("id-card-designs", { public: false });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("already exists") || msg.includes("bucket already exists")) {
        return NextResponse.json({ ok: true, existing: true }, { status: 200 });
      }
      return errResp(`Failed to create bucket: ${error.message}`);
    }
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg.toLowerCase().includes("already exists")) {
      return NextResponse.json({ ok: true, existing: true }, { status: 200 });
    }
    return errResp(`Unexpected error: ${msg}`);
  }
}
