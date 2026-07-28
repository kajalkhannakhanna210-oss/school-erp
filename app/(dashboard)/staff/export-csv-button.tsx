"use client";

import { Button } from "@/components/ui";

type ExportRow = {
  employee_id: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  mobile_number: string | null;
};

function toCsv(rows: ExportRow[]) {
  const header = ["Employee ID", "Name", "Department", "Designation", "Mobile"];
  const lines = rows.map((r) =>
    [r.employee_id, r.full_name, r.department ?? "", r.designation ?? "", r.mobile_number ?? ""]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function ExportCsvButton({ rows }: { rows: ExportRow[] }) {
  function handleExport() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="ghost" onClick={handleExport} disabled={rows.length === 0}>
      Export CSV
    </Button>
  );
}
