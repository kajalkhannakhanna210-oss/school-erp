"use client";

import { Button } from "@/components/ui";

interface ExportLeavingStudentsProps {
  requests: any[];
}

export function ExportLeavingStudentsButtons({ requests }: ExportLeavingStudentsProps) {
  function exportCSV() {
    if (!requests || requests.length === 0) return;
    const headers = [
      "Certificate No",
      "Admission No",
      "Student Name",
      "Class",
      "Section",
      "Leaving Date",
      "Reason",
      "Status",
      "Clearance Status",
    ];

    const rows = requests.map((r) => [
      r.certificate_number || "",
      r.admission_number || "",
      `"${(r.student_name || "").replace(/"/g, '""')}"`,
      `"${((r.classes as any)?.name || "").replace(/"/g, '""')}"`,
      `"${((r.sections as any)?.name || "").replace(/"/g, '""')}"`,
      r.leaving_date || "",
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.status || "",
      r.overall_clearance_status || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leaving-students-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportExcel() {
    // Standard TSV format readable directly by Excel
    if (!requests || requests.length === 0) return;
    const headers = [
      "Certificate No\tAdmission No\tStudent Name\tClass\tSection\tLeaving Date\tReason\tStatus\tClearance Status",
    ];

    const rows = requests.map(
      (r) =>
        `${r.certificate_number || ""}\t${r.admission_number || ""}\t${r.student_name || ""}\t${
          (r.classes as any)?.name || ""
        }\t${(r.sections as any)?.name || ""}\t${r.leaving_date || ""}\t${r.reason || ""}\t${r.status || ""}\t${
          r.overall_clearance_status || ""
        }`
    );

    const tsvContent = "data:application/vnd.ms-excel;charset=utf-8," + encodeURIComponent([headers[0], ...rows].join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", tsvContent);
    link.setAttribute("download", `leaving-students-${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printPDF() {
    window.print();
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={exportCSV}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        title="Export CSV"
      >
        <span>📥</span> <span className="hidden sm:inline">Export </span>CSV
      </button>

      <button
        type="button"
        onClick={exportExcel}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition"
        title="Export Excel"
      >
        <span>📊</span> <span className="hidden sm:inline">Export </span>Excel
      </button>

      <button
        type="button"
        onClick={printPDF}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        title="Print / Save PDF"
      >
        <span>🖨️</span> <span className="hidden sm:inline">Export </span>PDF
      </button>
    </div>
  );
}
