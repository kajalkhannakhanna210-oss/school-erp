import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { userHasPermission, getUserActionScope } from "@/lib/enquiries-server";
import { revalidatePath } from "next/cache";

const allowedFilters = new Set(["all", "today", "overdue", "upcoming", "won"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const canView = await userHasPermission(supabase, authUser.user.id, "admission_enquiry.view");
  const viewScope = await getUserActionScope(supabase, authUser.user.id, "view");
  if (!canView || (!viewScope.all && !viewScope.ownAssigned && viewScope.classes.length === 0)) {
    return NextResponse.json({ error: "Not authorized to view enquiries" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const filter = typeof body?.filter === "string" ? body.filter : "all";
  if (!allowedFilters.has(filter)) return NextResponse.json({ error: "Invalid filter" }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("enquiries_tab_filter", filter, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath("/enquiries");
  return response;
}
