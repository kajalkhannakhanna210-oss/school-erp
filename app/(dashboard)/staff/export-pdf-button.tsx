"use client";

import { useState } from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui";
import type { ExportRow } from "./export-excel-button";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, color: "#243b53" },
  title: { fontSize: 18, marginBottom: 14, fontWeight: 700 },
  header: { flexDirection: "row", backgroundColor: "#243b53", color: "#ffffff", padding: 6, fontWeight: 700 },
  row: { flexDirection: "row", minHeight: 48, borderBottomWidth: 1, borderBottomColor: "#d9e2ec", alignItems: "center", padding: 4 },
  image: { width: 36, height: 36, objectFit: "cover", marginRight: 5 },
  cell: { paddingHorizontal: 3 },
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()} ${String(hour12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function StaffDocument({ rows }: { rows: ExportRow[] }) {
  const columns = ["Photo", "Employee ID", "Name", "Department", "Designation", "Qualification", "Mobile", "Email", "Salary", "Joining date", "Status", "Inactive date", "Inactive by", "Created at"];
  return <Document><Page size="A4" orientation="landscape" style={styles.page} wrap>
    <Text style={styles.title}>Staff Directory</Text>
    <View style={styles.header}>{columns.map((column) => <Text key={column} style={[styles.cell, { width: column === "Photo" ? "6%" : column === "Name" ? "12%" : "9%" }]}>{column}</Text>)}</View>
    {rows.map((row) => <View key={row.id} style={styles.row} wrap={false}>
      <View style={[styles.cell, { width: "6%" }]}>{row.photo_url ? <Image src={row.photo_url} style={styles.image} /> : <Text>—</Text>}</View>
      {[row.employee_id, row.full_name, row.department ?? "—", row.designation ?? "—", row.qualification ?? "—", row.mobile_number ?? "—", row.contact_email ?? "—", row.salary == null ? "—" : String(row.salary), formatDate(row.joining_date), row.is_active ? "Active" : "Inactive", formatDateTime(row.inactive_date), row.inactive_by ?? "—", formatDateTime(row.created_at)].map((value, index) => <Text key={`${row.id}-${index}`} style={[styles.cell, { width: index === 1 ? "12%" : "9%" }]}>{value}</Text>)}
    </View>)}
  </Page></Document>;
}

export function ExportPdfButton({ rows }: { rows: ExportRow[] }) {
  const [processing, setProcessing] = useState(false);

  async function handleExport() {
    setProcessing(true);
    try {
      const blob = await pdf(<StaffDocument rows={rows} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `staff-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setProcessing(false);
    }
  }

  return <Button onClick={handleExport} disabled={rows.length === 0 || processing}>{processing ? "Processing…" : "PDF"}</Button>;
}
