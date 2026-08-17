import { buildPaidMap, computeOutstanding } from "@/lib/fees";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ReportColumn = { key: string; label: string; align?: "left" | "right" };
export type ReportResult = { title: string; columns: ReportColumn[]; rows: Record<string, string | number>[] };

export const REPORT_TYPES = ["collection", "pending-fees", "concessions", "late-fees", "attendance", "leaving-students"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export async function getReport(
  supabase: SupabaseServerClient,
  type: string,
  filters: Record<string, string>
): Promise<ReportResult | null> {
  switch (type) {
    case "collection":
      return getCollectionReport(supabase, filters);
    case "pending-fees":
      return getPendingFeesReport(supabase, filters);
    case "concessions":
      return getConcessionReport(supabase, filters);
    case "late-fees":
      return getLateFeeReport(supabase, filters);
    case "attendance":
      return getAttendanceSummaryReport(supabase, filters);
    case "leaving-students":
      return getLeavingStudentsReport(supabase, filters);
    default:
      return null;
  }
}

async function getCollectionReport(supabase: SupabaseServerClient, filters: Record<string, string>): Promise<ReportResult> {
  const from = filters.from || "1970-01-01";
  const to = filters.to || new Date().toISOString().slice(0, 10);
  const groupBy = filters.groupBy === "day" ? "day" : "month";

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", `${to}T23:59:59`);

  const groups = new Map<string, { count: number; total: number }>();
  for (const p of payments ?? []) {
    if (!p.paid_at) continue;
    const key = groupBy === "day" ? p.paid_at.slice(0, 10) : p.paid_at.slice(0, 7);
    const g = groups.get(key) ?? { count: 0, total: 0 };
    g.count += 1;
    g.total += Number(p.amount);
    groups.set(key, g);
  }

  const rows = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, g]) => ({ period, payments: g.count, total: g.total.toFixed(2) }));

  return {
    title: "Collection Report",
    columns: [
      { key: "period", label: groupBy === "day" ? "Date" : "Month" },
      { key: "payments", label: "Payments", align: "right" },
      { key: "total", label: "Total (Rs.)", align: "right" },
    ],
    rows,
  };
}

async function getPendingFeesReport(
  supabase: SupabaseServerClient,
  filters: Record<string, string>
): Promise<ReportResult> {
  let query = supabase
    .from("student_fee_line_items")
    .select("student_id, class_id, section_id, fee_head_id, net_amount, late_fee");
  if (filters.class) query = query.eq("class_id", filters.class);
  if (filters.section) query = query.eq("section_id", filters.section);
  const { data: lines } = await query;

  const { data: paid } = await supabase.from("payments").select("student_id, fee_head_id, amount").eq("status", "paid");
  const paidMap = buildPaidMap(paid ?? []);

  const perStudent = new Map<string, number>();
  for (const l of lines ?? []) {
    const outstanding = computeOutstanding(l, paidMap);
    if (outstanding > 0) {
      perStudent.set(l.student_id, (perStudent.get(l.student_id) ?? 0) + outstanding);
    }
  }

  const rows = await withStudentDetails(supabase, perStudent, (s, total) => ({
    admission_number: s.admission_number,
    name: s.name,
    class: s.classLabel,
    outstanding: total.toFixed(2),
  }));
  rows.sort((a, b) => Number(b.outstanding) - Number(a.outstanding));

  return {
    title: "Pending Fees",
    columns: [
      { key: "admission_number", label: "Admission No" },
      { key: "name", label: "Name" },
      { key: "class", label: "Class" },
      { key: "outstanding", label: "Outstanding (Rs.)", align: "right" },
    ],
    rows,
  };
}

async function getConcessionReport(
  supabase: SupabaseServerClient,
  filters: Record<string, string>
): Promise<ReportResult> {
  let query = supabase
    .from("student_concessions")
    .select(
      "concession_type, value, students!inner(admission_number, class_id, profiles(full_name), classes(name), sections(name)), fee_heads(name)"
    );
  if (filters.class) query = query.eq("students.class_id", filters.class);
  const { data } = await query;

  const rows = ((data ?? []) as any[]).map((c) => ({
    admission_number: c.students?.admission_number ?? "",
    name: c.students?.profiles?.full_name ?? "",
    class: `${c.students?.classes?.name ?? ""} - ${c.students?.sections?.name ?? ""}`,
    fee_head: c.fee_heads?.name ?? "",
    concession: c.concession_type === "percentage" ? `${c.value}%` : `Rs. ${c.value}`,
  }));

  return {
    title: "Concession Report",
    columns: [
      { key: "admission_number", label: "Admission No" },
      { key: "name", label: "Name" },
      { key: "class", label: "Class" },
      { key: "fee_head", label: "Fee Head" },
      { key: "concession", label: "Concession" },
    ],
    rows,
  };
}

async function getLateFeeReport(supabase: SupabaseServerClient, filters: Record<string, string>): Promise<ReportResult> {
  let query = supabase
    .from("student_fee_line_items")
    .select("student_id, class_id, section_id, fee_head_name, late_fee, current_due_date");
  if (filters.class) query = query.eq("class_id", filters.class);
  if (filters.section) query = query.eq("section_id", filters.section);
  const { data: lines } = await query;

  const withLateFee = ((lines ?? []) as any[]).filter((l) => Number(l.late_fee) > 0);
  if (withLateFee.length === 0) {
    return { title: "Late Fee Report", columns: lateFeeColumns(), rows: [] };
  }

  const studentIds = [...new Set(withLateFee.map((l) => l.student_id))];
  const { data: students } = await supabase
    .from("students")
    .select("id, admission_number, profiles(full_name), classes(name), sections(name)")
    .in("id", studentIds);
  const studentMap = new Map(((students ?? []) as any[]).map((s) => [s.id, s]));

  const rows = withLateFee.map((l) => {
    const s = studentMap.get(l.student_id);
    return {
      admission_number: s?.admission_number ?? "",
      name: s?.profiles?.full_name ?? "",
      class: `${s?.classes?.name ?? ""} - ${s?.sections?.name ?? ""}`,
      fee_head: l.fee_head_name,
      due_date: l.current_due_date ?? "",
      late_fee: Number(l.late_fee).toFixed(2),
    };
  });

  return { title: "Late Fee Report", columns: lateFeeColumns(), rows };
}

function lateFeeColumns(): ReportColumn[] {
  return [
    { key: "admission_number", label: "Admission No" },
    { key: "name", label: "Name" },
    { key: "class", label: "Class" },
    { key: "fee_head", label: "Fee Head" },
    { key: "due_date", label: "Due Date" },
    { key: "late_fee", label: "Late Fee (Rs.)", align: "right" },
  ];
}

async function getAttendanceSummaryReport(
  supabase: SupabaseServerClient,
  filters: Record<string, string>
): Promise<ReportResult> {
  const from = filters.from || "1970-01-01";
  const to = filters.to || new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("attendance_records")
    .select("student_id, status, attendance_batches!inner(class_id, section_id)")
    .gte("attendance_date", from)
    .lte("attendance_date", to);
  if (filters.class) query = query.eq("attendance_batches.class_id", filters.class);
  if (filters.section) query = query.eq("attendance_batches.section_id", filters.section);
  const { data: records } = await query;

  type Stat = { present: number; absent: number; late: number; leave: number; total: number };
  const perStudent = new Map<string, Stat>();
  for (const r of (records ?? []) as any[]) {
    const stat = perStudent.get(r.student_id) ?? { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    if (r.status in stat) (stat as any)[r.status] += 1;
    stat.total += 1;
    perStudent.set(r.student_id, stat);
  }

  const studentIds = [...perStudent.keys()];
  if (studentIds.length === 0) {
    return { title: "Attendance Summary", columns: attendanceColumns(), rows: [] };
  }
  const { data: students } = await supabase
    .from("students")
    .select("id, admission_number, profiles(full_name), classes(name), sections(name)")
    .in("id", studentIds);

  const rows = ((students ?? []) as any[]).map((s) => {
    const stat = perStudent.get(s.id)!;
    const pct = stat.total > 0 ? Math.round(((stat.present + stat.late) / stat.total) * 100) : 0;
    return {
      admission_number: s.admission_number,
      name: s.profiles?.full_name ?? "",
      class: `${s.classes?.name ?? ""} - ${s.sections?.name ?? ""}`,
      present: stat.present,
      absent: stat.absent,
      late: stat.late,
      leave: stat.leave,
      present_rate: `${pct}%`,
    };
  });

  return { title: "Attendance Summary", columns: attendanceColumns(), rows };
}

function attendanceColumns(): ReportColumn[] {
  return [
    { key: "admission_number", label: "Admission No" },
    { key: "name", label: "Name" },
    { key: "class", label: "Class" },
    { key: "present", label: "Present", align: "right" },
    { key: "absent", label: "Absent", align: "right" },
    { key: "late", label: "Late", align: "right" },
    { key: "leave", label: "Leave", align: "right" },
    { key: "present_rate", label: "Present %", align: "right" },
  ];
}

// Shared "look up admission number / name / class label for a set of
// student ids and shape one row per student" step, used by any report that
// aggregates per-student first and only needs student details afterward.
async function withStudentDetails(
  supabase: SupabaseServerClient,
  perStudent: Map<string, number>,
  shape: (s: { admission_number: string; name: string; classLabel: string }, total: number) => Record<string, string>
) {
  const studentIds = [...perStudent.keys()];
  if (studentIds.length === 0) return [];

  const { data: students } = await supabase
    .from("students")
    .select("id, admission_number, profiles(full_name), classes(name), sections(name)")
    .in("id", studentIds);

  return ((students ?? []) as any[]).map((s) =>
    shape(
      {
        admission_number: s.admission_number,
        name: s.profiles?.full_name ?? "",
        classLabel: `${s.classes?.name ?? ""} - ${s.sections?.name ?? ""}`,
      },
      perStudent.get(s.id) ?? 0
    )
  );
}

async function getLeavingStudentsReport(supabase: SupabaseServerClient, filters: Record<string, string>): Promise<ReportResult> {
  let query = supabase.from("student_leaving_requests").select("admission_number, student_name, leaving_date, reason, status, overall_clearance_status, certificate_number, classes(name), sections(name)");

  if (filters.class_id) query = query.eq("class_id", filters.class_id);
  if (filters.section_id) query = query.eq("section_id", filters.section_id);
  if (filters.from) query = query.gte("leaving_date", filters.from);
  if (filters.to) query = query.lte("leaving_date", filters.to);

  const { data: requests } = await query.order("leaving_date", { ascending: false });

  const rows = (requests ?? []).map((r: any) => ({
    admission_number: r.admission_number,
    student_name: r.student_name,
    class_section: `${r.classes?.name ?? ""}${r.sections?.name ? ` - ${r.sections.name}` : ""}`,
    leaving_date: r.leaving_date,
    reason: r.reason ? r.reason.replaceAll("_", " ") : "N/A",
    status: r.status ? r.status.replaceAll("_", " ") : "N/A",
    clearance: r.overall_clearance_status ?? "pending",
    certificate_number: r.certificate_number ?? "Not Issued",
  }));

  return {
    title: "Leaving Students Report",
    columns: [
      { key: "admission_number", label: "ADM No." },
      { key: "student_name", label: "Student Name" },
      { key: "class_section", label: "Class / Sec" },
      { key: "leaving_date", label: "Leaving Date" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status" },
      { key: "clearance", label: "Clearance" },
      { key: "certificate_number", label: "Certificate No." },
    ],
    rows,
  };
}
