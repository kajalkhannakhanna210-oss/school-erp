"use client";

import { Button } from "@/components/ui";

type ExportRow = { employee_id: string; full_name: string; department: string | null; designation: string | null; mobile_number: string | null };

export function ExportExcelButton({ rows }: { rows: ExportRow[] }) {
  function handleExport() {
    const headers = ["Employee ID", "Name", "Department", "Designation", "Mobile"];
    const body = rows.map((r) => [r.employee_id, r.full_name, r.department ?? "", r.designation ?? "", r.mobile_number ?? ""]);
    const table = `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>${body.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}</table>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([table], { type: "application/vnd.ms-excel" }));
    link.download = `staff-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <Button variant="ghost" onClick={handleExport} disabled={rows.length === 0}>Export Excel</Button>;
}
