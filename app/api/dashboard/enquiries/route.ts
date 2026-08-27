import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEnquiryDashboardData, userHasPermission } from "@/lib/enquiries-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUser.user.id)
    .maybeSingle();
  const role = profile?.role;
  if ((role !== "super_admin" && role !== "staff") || !(await userHasPermission(supabase, authUser.user.id, "admission_enquiry.view"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const data = await getEnquiryDashboardData(supabase, role === "super_admin");
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
