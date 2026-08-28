import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEnquiries, getEnquiryActionPermissions } from "@/lib/enquiries-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.user.id).maybeSingle();
  const body = await request.json().catch(() => null);
  const raw = body?.filters && typeof body.filters === "object" ? body.filters : {};
  const filters = {
    id: typeof raw.id === "string" ? raw.id : undefined,
    q: typeof raw.q === "string" ? raw.q : undefined,
    session_id: typeof raw.session_id === "string" ? raw.session_id : undefined,
    class_id: typeof raw.class_id === "string" ? raw.class_id : undefined,
    enquiry_type: typeof raw.enquiry_type === "string" ? raw.enquiry_type : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
    assigned_staff_id: typeof raw.assigned_staff_id === "string" ? raw.assigned_staff_id : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    followup_due: ["today", "overdue", "upcoming", "none"].includes(raw.followup_due) ? raw.followup_due : undefined,
    page: 1,
    pageSize: 15,
  } as const;
  const result = await getEnquiries(supabase, filters, profile?.role === "super_admin");
  if (result.error) return NextResponse.json({ error: result.error }, { status: 403 });
  const actionPermissions = Object.fromEntries(
    await Promise.all(
      result.rows.map(async (row) => [row.id, await getEnquiryActionPermissions(supabase, row)] as const),
    ),
  );
  return NextResponse.json({ rows: result.rows, total: result.total, actionPermissions });
}
