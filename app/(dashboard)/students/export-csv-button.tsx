"use client";

import { Button } from "@/components/ui";

type ExportRow = {
  admission_number: string;
  roll_number: string | null;
  full_name: string;
  class_name: string | null;
  section_name: string | null;
  mobile_number: string | null;
  [key: string]: unknown;
};

function formatValue(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(value));
  return value;
}

function exportFields(rows: ExportRow[]) {
  const excluded = ["profiles", "classes", "sections", "academic_sessions", "class_id", "section_id", "session_id", "photo_path"];
  const preferred = ["admission_number", "roll_number", "full_name", "class_name", "section_name", "session_name", "mobile_number", "photo_url", "admission_date", "date_of_birth", "gender", "father_name", "mother_name", "blood_group", "address", "is_active"];
  return [...preferred, ...Object.keys(rows[0] ?? {}).filter((key) => !preferred.includes(key) && !excluded.includes(key))];
}

function label(field: string) { return field.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function escapeHtml(value: unknown) { return formatValue(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)); }

function toCsv(rows: ExportRow[]) {
  const fields = exportFields(rows);
  const header = ["Sr No", ...fields.map(label)];
  const lines = rows.map((r, index) =>
    [index + 1, ...fields.map((field) => r[field])]
      .map((cell) => `"${formatValue(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function ExportCsvButton({ rows }: { rows: ExportRow[] }) {
  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(format: "csv" | "excel" | "pdf") {
    const csv = toCsv(rows);
    const fields = exportFields(rows);
    const date = new Date().toISOString().slice(0, 10);
    if (format === "csv") download(csv, `students-${date}.csv`, "text/csv;charset=utf-8;");
    if (format === "excel") {
      const excel = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;vertical-align:middle}tr{height:96px}img{display:block;width:80px;height:80px;object-fit:cover}</style></head><body><table><tr><th>Sr No</th>${fields.map((field) => `<th>${label(field)}</th>`).join("")}</tr>${rows.map((r, index) => `<tr><td>${index + 1}</td>${fields.map((field) => `<td>${field === "photo_url" && r[field] ? `<img src="${escapeHtml(r[field])}" width="80" height="80" />` : escapeHtml(r[field])}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
      download(excel, `students-${date}.xls`, "application/vnd.ms-excel;charset=utf-8;");
    }
    if (format === "pdf") {
      const table = `<html><head><title>Student Records</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}img{width:80px;height:80px;object-fit:cover}h1{font-size:20px}</style></head><body><h1>Student Records</h1><table><thead><tr><th>Sr No</th>${fields.map((field) => `<th>${label(field)}</th>`).join("")}</tr></thead><tbody>${rows.map((r, index) => `<tr><td>${index + 1}</td>${fields.map((field) => `<td>${field === "photo_url" && r[field] ? `<img src="${escapeHtml(r[field])}" />` : escapeHtml(r[field])}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
      const printWindow = window.open("", "_blank");
      if (printWindow) { printWindow.document.write(table); printWindow.document.close(); }
    }
  }

  return (
    <div className="flex w-full items-center gap-2">
      <span className="hidden text-sm font-semibold text-ink-700 sm:inline">Export</span>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[90px] sm:flex-none" variant="primary" onClick={() => handleExport("csv")} disabled={rows.length === 0}>CSV</Button>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[90px] sm:flex-none" variant="primary" onClick={() => handleExport("excel")} disabled={rows.length === 0}>Excel</Button>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[90px] sm:flex-none" variant="primary" onClick={() => handleExport("pdf")} disabled={rows.length === 0}>PDF</Button>
    </div>
  );
}
