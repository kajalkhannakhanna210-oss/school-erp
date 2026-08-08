"use client";

import { useState } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui";

export type ExportRow = {
  id: string;
  employee_id: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  qualification: string | null;
  mobile_number: string | null;
  contact_email: string | null;
  salary: number | null;
  joining_date: string | null;
  is_active: boolean;
  inactive_date: string | null;
  inactive_by: string | null;
  created_at: string | null;
  photo_url: string | null;
};

export function ExportExcelButton({ rows }: { rows: ExportRow[] }) {
  const [processing, setProcessing] = useState(false);

  async function handleExport() {
    setProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Staff");
    const headers = ["Profile image", "Employee ID", "Name", "Department", "Designation", "Qualification", "Mobile", "Email", "Salary", "Joining date", "Status", "Inactive date", "Inactive by", "Created at"];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243B53" } };
    sheet.getRow(1).alignment = { vertical: "middle" };

    for (const [index, row] of rows.entries()) {
      const joiningDate = row.joining_date ? new Date(`${row.joining_date}T00:00:00`) : null;
      const createdAt = row.created_at ? new Date(row.created_at) : null;
    const excelRow = sheet.addRow(["", row.employee_id, row.full_name, row.department ?? "", row.designation ?? "", row.qualification ?? "", row.mobile_number ?? "", row.contact_email ?? "", row.salary ?? "", joiningDate, row.is_active ? "Active" : "Inactive", row.inactive_date ? new Date(row.inactive_date) : null, row.inactive_by ?? "", createdAt]);
      excelRow.height = 64;
      if (row.photo_url) {
        try {
          const response = await fetch(row.photo_url);
          if (response.ok) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            let binary = "";
            bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
            const extension = response.headers.get("content-type")?.split("/")[1] === "png" ? "png" : "jpeg";
            const imageId = workbook.addImage({ base64: `data:image/${extension};base64,${btoa(binary)}`, extension });
            sheet.addImage(imageId, { tl: { col: 0, row: index + 1 }, ext: { width: 56, height: 56 } });
          }
        } catch { /* Keep the row exportable if one image cannot be fetched. */ }
      }
    }
    sheet.columns.forEach((column, index) => { column.width = index === 0 ? 16 : Math.min(28, Math.max(12, headers[index].length + 2)); });
    sheet.getColumn(9).numFmt = "#,##0.00";
    sheet.getColumn(10).numFmt = "dd mmm yyyy";
    sheet.getColumn(12).numFmt = "dd mmm yyyy hh:mm AM/PM";
    sheet.getColumn(13).numFmt = "dd mmm yyyy hh:mm AM/PM";
    sheet.getColumn(15).numFmt = "dd mmm yyyy hh:mm AM/PM";
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
      URL.revokeObjectURL(url);
    } finally {
      setProcessing(false);
    }
  }

  return <Button onClick={handleExport} disabled={rows.length === 0 || processing}>{processing ? "Processing…" : "Excel"}</Button>;
}
