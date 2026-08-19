import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePageAccess("student_id_cards");
  } catch (e) {
    return error("Not authorized.", 403);
  }

  const studentId = params.id;
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!studentId) return error("Missing student id.", 400);

  const supabase = await createClient();
  try {
    // Always fetch the latest version (order by version desc, limit 1)
    // Include template dimensions by joining the templates table (alias `template`)
    const { data, error: qErr } = await supabase
      .from("student_id_cards")
      .select("*, template:student_id_card_templates(width_mm, height_mm, orientation)")
      .eq("student_id", studentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If session_id is provided, prefer that (also ordered)
    if (sessionId) {
      const { data: sData, error: sErr } = await supabase
        .from("student_id_cards")
        .select("*, template:student_id_card_templates(width_mm, height_mm, orientation)")
        .eq("student_id", studentId)
        .eq("session_id", sessionId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sErr) return error(`Failed to fetch card: ${sErr.message}`, 500);
      if (!sData) return error("No card found for the given session.", 404);
      return NextResponse.json({ card: sData }, { status: 200 });
    }

    if (qErr) return error(`Failed to fetch card: ${qErr.message}`, 500);
    if (!data) return error("No card found.", 404);

    return NextResponse.json({ card: data }, { status: 200 });
  } catch (e: any) {
    return error(`Query failed: ${String(e?.message || e)}`, 500);
  }
}
