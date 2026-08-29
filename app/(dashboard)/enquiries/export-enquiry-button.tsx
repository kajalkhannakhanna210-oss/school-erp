"use client";

import { Button } from "@/components/ui";

function formatValue(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(value));
  return value;
}

function label(field: string) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(value: unknown) {
  return formatValue(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

export function ExportEnquiryButton({ rows, filenamePrefix = "enquiries" }: { rows: Record<string, any>[]; filenamePrefix?: string }) {
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
    if (!rows.length) return;
    const fields = Object.keys(rows[0]);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}-${date}`;

    if (format === "csv") {
      const header = ["Sr No", ...fields.map(label)].join(",");
      const lines = rows.map((r, index) =>
        [index + 1, ...fields.map((field) => r[field])]
          .map((cell) => `"${formatValue(cell).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      download(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
    }

    if (format === "excel") {
      const excel = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body><h2>Admission Enquiry Export</h2><table><tr><th>Sr No</th>${fields.map((field) => `<th>${label(field)}</th>`).join("")}</tr>${rows.map((r, index) => `<tr><td>${index + 1}</td>${fields.map((field) => `<td>${escapeHtml(r[field])}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
      download(excel, `${filename}.xls`, "application/vnd.ms-excel;charset=utf-8;");
    }

    if (format === "pdf") {
      const html = `<html><head><title>Admission Enquiry Export</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f1f3f9}h1{font-size:18px;color:#222F57}</style></head><body><h1>Admission Enquiry Export</h1><p>Date generated: ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Sr No</th>${fields.map((field) => `<th>${label(field)}</th>`).join("")}</tr></thead><tbody>${rows.map((r, index) => `<tr><td>${index + 1}</td>${fields.map((field) => `<td>${escapeHtml(r[field])}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    }
  }

  return (
    <div className="flex w-max shrink-0 items-center gap-1.5 sm:w-auto">
      <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate/60 sm:inline">Export:</span>
      <Button className="h-9 px-3 text-xs" variant="primary" onClick={() => handleExport("csv")} disabled={rows.length === 0}>
        CSV
      </Button>
      <Button className="h-9 px-3 text-xs" variant="primary" onClick={() => handleExport("excel")} disabled={rows.length === 0}>
        Excel
      </Button>
      <Button className="h-9 px-3 text-xs" variant="primary" onClick={() => handleExport("pdf")} disabled={rows.length === 0}>
        Print / PDF
      </Button>
    </div>
  );
}
