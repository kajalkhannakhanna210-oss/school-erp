import { NextResponse, type NextRequest } from "next/server";
import { hasReportsAccess } from "@/lib/require-role";
import { getReport } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { renderReportExcel } from "./report-excel";
import { renderReportPdf } from "./report-pdf";

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