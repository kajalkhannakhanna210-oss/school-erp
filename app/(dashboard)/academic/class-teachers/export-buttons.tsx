"use client";

import { useState } from "react";
import ExcelJS from "exceljs";
import { createElement } from "react";
import { Button } from "@/components/ui";
import type { Assignment } from "./assign-form";

const columns = ["Class", "Section", "Session", "Teacher"];

function values(assignment: Assignment) {
  const profile = Array.isArray(assignment.profiles) ? assignment.profiles[0] : assignment.profiles;
  return [
    assignment.classes?.name ?? "",
    assignment.sections?.name ?? "",
    assignment.academic_sessions?.name ?? "",
    profile?.full_name ?? "Unknown teacher",
  ];
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ClassTeacherExports({ assignments }: { assignments: Assignment[] }) {
  const [processing, setProcessing] = useState<"csv" | "excel" | "pdf" | null>(null);
  const filename = `class-teacher-assignments-${new Date().toISOString().slice(0, 10)}`;

  function download(blob: Blob, extension: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportCsv() {
    setProcessing("csv");
    download(new Blob([[columns, ...assignments.map(values)].map((row) => row.map(csvValue).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), "csv");
    setProcessing(null);
  }

  async function exportExcel() {
    setProcessing("excel");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Assignments");
    sheet.addRow(columns);
    assignments.forEach((assignment) => sheet.addRow(values(assignment)));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243B53" } };
    sheet.columns.forEach((column) => { column.width = 24; });
    const buffer = await workbook.xlsx.writeBuffer();
    download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "xlsx");
    setProcessing(null);
  }

  async function exportPdf() {
    setProcessing("pdf");
    const renderer = await import("@react-pdf/renderer");
    const styles = renderer.StyleSheet.create({
      page: { padding: 28, fontSize: 10, color: "#243b53" },
      title: { fontSize: 18, marginBottom: 14 },
      header: { flexDirection: "row", backgroundColor: "#243b53", color: "#ffffff", padding: 7 },
      row: { flexDirection: "row", padding: 7, borderBottomWidth: 1, borderBottomColor: "#d9e2ec" },
      cell: { width: "25%" },
    });
    const header = createElement(renderer.View, { style: styles.header }, columns.map((column) =>
      createElement(renderer.Text, { key: column, style: styles.cell }, column),
    ));
    const rows = assignments.map((assignment) =>
      createElement(renderer.View, { key: assignment.id, style: styles.row },
        values(assignment).map((value, index) =>
          createElement(renderer.Text, { key: `${assignment.id}-${index}`, style: styles.cell }, value),
        ),
      ),
    );
    const document = createElement(renderer.Document, null,
      createElement(renderer.Page, { size: "A4", style: styles.page },
        createElement(renderer.Text, { style: styles.title }, "Class Teacher Assignments"),
        header,
        rows,
      ),
    );
    const blob = await renderer.pdf(document).toBlob();
    download(blob, "pdf");
    setProcessing(null);
  }

  const disabled = assignments.length === 0 || processing !== null;
  return (
    <div className="flex w-full items-center gap-1.5 sm:w-auto">
      <Button size="sm" variant="outline" className="min-w-0 flex-1 gap-1.5 bg-white sm:min-w-20 sm:flex-none" onClick={exportCsv} disabled={disabled} title="Export CSV">
        <span aria-hidden="true">⇩</span><span>{processing === "csv" ? "…" : "CSV"}</span>
      </Button>
      <Button size="sm" variant="outline" className="min-w-0 flex-1 gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 sm:min-w-20 sm:flex-none" onClick={exportExcel} disabled={disabled} title="Export Excel">
        <span aria-hidden="true">▥</span><span>{processing === "excel" ? "…" : "Excel"}</span>
      </Button>
      <Button size="sm" variant="outline" className="min-w-0 flex-1 gap-1.5 bg-white sm:min-w-20 sm:flex-none" onClick={exportPdf} disabled={disabled} title="Print or export PDF">
        <span aria-hidden="true">▣</span><span>{processing === "pdf" ? "…" : "Print"}</span>
      </Button>
    </div>
  );
}
