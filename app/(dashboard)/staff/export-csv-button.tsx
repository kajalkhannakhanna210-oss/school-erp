"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { ExportRow } from "./export-excel-button";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()} ${String(hour12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function toCsv(rows: ExportRow[]) {
  const header = ["Profile image", "Employee ID", "Name", "Department", "Designation", "Qualification", "Mobile", "Email", "Salary", "Joining date", "Status", "Inactive date", "Inactive by", "Created at"];
  const lines = rows.map((r) =>
    [r.photo_url ?? "", r.employee_id, r.full_name, r.department ?? "", r.designation ?? "", r.qualification ?? "", r.mobile_number ?? "", r.contact_email ?? "", r.salary ?? "", formatDate(r.joining_date), r.is_active ? "Active" : "Inactive", formatDateTime(r.inactive_date), r.inactive_by ?? "", formatDateTime(r.created_at)]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function ExportCsvButton({ rows }: { rows: ExportRow[] }) {
  const [processing, setProcessing] = useState(false);

  function handleExport() {
    setProcessing(true);
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setProcessing(false);
  }

  return (
    <Button onClick={handleExport} disabled={rows.length === 0 || processing}>
      {processing ? "Processing…" : "CSV"}
    </Button>
  );
}
