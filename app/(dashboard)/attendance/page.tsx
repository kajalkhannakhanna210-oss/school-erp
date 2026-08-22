import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { AttendanceSheet } from "./attendance-sheet";
import { ClassSectionPicker } from "./class-section-picker";

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  leave: "On Leave",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { class?: string; section?: string; date?: string; month?: string };
}) {
  try {
    await requirePageAccess("attendance");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role === "student") {
    return <StudentAttendanceView studentId={user!.id} month={searchParams.month} />;
  }

  return (
    <ManagerAttendanceView
      viewerId={user!.id}
      isAdmin={profile?.role === "super_admin"}
      searchParams={searchParams}
    />
  );
}

async function StudentAttendanceView({ studentId, month }: { studentId: string; month?: string }) {
  const supabase = await createClient();
  const now = new Date();
  const [year, monthNum] = (month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const monthStart = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${year}-${String(monthNum).padStart(2, "0")}-${String(monthEndDate).padStart(2, "0")}`;

  const { data: records } = await supabase
    .from("attendance_records")
    .select("attendance_date, status")
    .eq("student_id", studentId)
    .gte("attendance_date", monthStart)
    .lte("attendance_date", monthEnd)
    .order("attendance_date");

  const rows = records ?? [];
  const counts: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const total = rows.length;
  const presentPct = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : null;

  const prevMonth = new Date(year, monthNum - 2, 1);
  const nextMonth = new Date(year, monthNum, 1);
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">My Attendance</h1>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <Link href={`/attendance?month=${prevKey}`} className="text-ink-600 hover:underline">
          ← Previous month
        </Link>
        <span className="font-medium text-ink-700">
          {new Date(year, monthNum - 1).toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <Link href={`/attendance?month=${nextKey}`} className="text-ink-600 hover:underline">
          Next month →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate/50">Present rate</p>
          <p className="mt-2 font-display text-3xl text-ink-700">{presentPct != null ? `${presentPct}%` : "—"}</p>
        </Card>
        {Object.entries(counts).map(([status, count]) => (
          <Card key={status}>
            <p className="text-xs uppercase tracking-wide text-slate/50">{STATUS_LABELS[status]}</p>
            <p className="mt-2 font-display text-3xl text-ink-700">{count}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Date</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attendance_date} className="border-b border-ink-100 last:border-0">
                <td className="py-2 font-mono">{r.attendance_date}</td>
                <td className="py-2">{STATUS_LABELS[r.status]}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-slate/50">
                  No attendance recorded this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

async function ManagerAttendanceView({
  viewerId,
  isAdmin,
  searchParams,
}: {
  viewerId: string;
  isAdmin: boolean;
  searchParams: { class?: string; section?: string; date?: string };
}) {
  const supabase = await createClient();

  let hasBroadAccess = isAdmin;
  if (!isAdmin) {
    const { data: permission } = await supabase
      .from("staff_permissions")
      .select("permission_key")
      .eq("staff_id", viewerId)
      .eq("permission_key", "mark_attendance")
      .maybeSingle();
    hasBroadAccess = !!permission;
  }

  let picker: ReactNode;
  if (hasBroadAccess) {
    const [{ data: classes }, { data: sections }] = await Promise.all([
      supabase.from("classes").select("id, name").order("sort_order"),
      supabase.from("sections").select("id, name, class_id").order("name"),
    ]);
    picker = <ClassSectionPicker mode="full" classes={classes ?? []} sections={sections ?? []} />;
  } else {
    const { data: assigned } = await supabase
      .from("class_teachers")
      .select("class_id, section_id, classes(name), sections(name)")
      .eq("staff_id", viewerId);
    const pairs = (assigned ?? []).map((a: any) => ({
      class_id: a.class_id,
      section_id: a.section_id,
      label: `${a.classes?.name} - ${a.sections?.name}`,
    }));
    picker = <ClassSectionPicker mode="assigned" pairs={pairs} />;
  }

  const { class: classId, section: sectionId, date } = searchParams;

  let sheet: ReactNode = null;
  if (classId && sectionId && date) {
    const [{ data: students }, { data: batch }, { data: currentSession }, { data: classRow }, { data: sectionRow }] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, admission_number, profiles!students_id_fkey(full_name)")
          .eq("class_id", classId)
          .eq("section_id", sectionId)
          .eq("is_active", true)
          .order("admission_number"),
        supabase
          .from("attendance_batches")
          .select("id, is_locked")
          .eq("class_id", classId)
          .eq("section_id", sectionId)
          .eq("attendance_date", date)
          .maybeSingle(),
        supabase.from("academic_sessions").select("id").eq("is_current", true).maybeSingle(),
        supabase.from("classes").select("name").eq("id", classId).single(),
        supabase.from("sections").select("name").eq("id", sectionId).single(),
      ]);

    let existingStatuses: Record<string, string> = {};
    if (batch) {
      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("batch_id", batch.id);
      existingStatuses = Object.fromEntries((records ?? []).map((r) => [r.student_id, r.status]));
    }

    const studentRows = (students ?? []).map((s: any) => ({
      id: s.id,
      admission_number: s.admission_number,
      full_name: s.profiles?.full_name ?? "",
    }));

    sheet = (
      <div className="mt-6">
        <AttendanceSheet
          students={studentRows}
          batch={batch ?? null}
          existingStatuses={existingStatuses}
          classId={classId}
          sectionId={sectionId}
          sessionId={currentSession?.id ?? ""}
          date={date}
          label={`${classRow?.name} - ${sectionRow?.name} · ${date}`}
          canOverride={isAdmin}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Attendance</h1>
      <p className="mt-1 text-sm text-slate/60">Pick a class, section, and date to mark or review.</p>
      <div className="mt-6">{picker}</div>
      {sheet}
    </div>
  );
}

