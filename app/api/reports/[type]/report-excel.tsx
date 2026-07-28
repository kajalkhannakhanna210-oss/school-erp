import ExcelJS from "exceljs";
import type { ReportResult } from "@/lib/reports";

export async function renderReportExcel(result: ReportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  // Excel sheet names are capped at 31 characters.
  const sheet = workbook.addWorksheet(result.title.slice(0, 31));

  sheet.columns = result.columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 14),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of result.rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
