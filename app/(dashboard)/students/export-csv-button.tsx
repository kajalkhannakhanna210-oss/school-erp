"use client";

import { Button } from "@/components/ui";

type ExportRow = {
  admission_number: string;
  roll_number: string | null;
  full_name: string;
  class_name: string | null;
  section_name: string | null;
  mobile_number: string | null;
};

function toCsv(rows: ExportRow[]) {
  const header = ["Admission No", "Roll No", "Name", "Class", "Section", "Mobile"];
  const lines = rows.map((r) =>
    [r.admission_number, r.roll_number ?? "", r.full_name, r.class_name ?? "", r.section_name ?? "", r.mobile_number ?? ""]
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
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="ghost" onClick={handleExport} disabled={rows.length === 0}>
      Export CSV
    </Button>
  );
}
