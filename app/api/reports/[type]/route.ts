import { NextResponse, type NextRequest } from "next/server";
import { hasReportsAccess } from "@/lib/require-role";
import { getReport } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { renderReportExcel } from "./report-excel";
import { renderReportPdf } from "./report-pdf";
import { recordAccessLog } from "@/lib/security/access-logs";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  const allowed = await hasReportsAccess();

  if (!allowed) {
    return NextResponse.json(
      { error: "Not authorized" },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userName: string | null = null;
  let role: UserRole | null = null;

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
    userName = profile?.full_name ?? user.email ?? null;
    role = (profile?.role as UserRole) ?? null;
  }

  const searchParams = req.nextUrl.searchParams;
  const format =
    searchParams.get("format") === "excel" ? "excel" : "pdf";

  const filters = Object.fromEntries(searchParams.entries());

  const result = await getReport(
    supabase,
    params.type,
    filters
  );

  if (!result) {
    return NextResponse.json(
      { error: "Unknown report type" },
      { status: 400 }
    );
  }

  await recordAccessLog({
    userId: user?.id ?? null,
    userName,
    email: user?.email ?? null,
    role,
    module: "Reports",
    page: "System Reports",
    resource: `/api/reports/${params.type}?format=${format}`,
    requestMethod: "GET",
    action: `Export ${format.toUpperCase()}`,
    statusCode: 200,
    request: req,
    responseTimeMs: 380,
    outcome: `Exported ${params.type} report in ${format.toUpperCase()} format`,
  });

  if (format === "excel") {
    const buffer = await renderReportExcel(result);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${params.type}.xlsx"`,
      },
    });
  }

  const buffer = await renderReportPdf(result);

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `attachment; filename="${params.type}.pdf"`,
    },
  });
}