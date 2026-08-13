import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { getStudentFeeLines } from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import type { UserRole } from "@/lib/types";
import { AdmissionComparisonChart, ClassStrengthChart, CollectionTrendChart, StaffSessionChart, StudentSessionChart } from "./dashboard-charts";

const widgetsByRole: Record<UserRole, string[]> = {
  super_admin: [
    "Total Students",
    "New Admissions",
    "With Admission No",
    "Without Admission No",
    "Total Staff",
    "Today's Collection",
    "Monthly Collection",
    "Pending Fees",
  ],
  staff: ["My Students", "Attendance to Mark Today", "Notices"],
  student: ["Fee Status", "Attendance Summary", "Notices"],
};

function DashboardMetricIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    "Total Students": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-7.75 M16 3.13a4 4 0 0 1 0 7.75",
    "New Admissions": "M15 19a4 4 0 0 0-8 0 M11 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19 8v6 M22 11h-6",
    "With Admission No": "M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z M9 12l2 2 4-4",
    "Without Admission No": "M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z M12 9v4 M12 16h.01",
    "Total Staff": "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  };

  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] ?? paths["Total Students"]} />
    </svg>
  );
}

export default async function DashboardPage() {
  try {
    await requirePageAccess("dashboard");
  } catch {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role ?? "student") as UserRole;
  const widgets = widgetsByRole[role];
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const { count: studentCount } =
    role === "super_admin" || role === "staff"
      ? await supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true)
      : { count: null };

  const { count: withAdmissionCount } = role === "super_admin" ? await supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true).not("admission_number", "is", null) : { count: null };
  const { count: withoutAdmissionCount } = role === "super_admin" ? await supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true).is("admission_number", null) : { count: null };

  const { count: staffCount } =
    role === "super_admin"
      ? await supabase.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true)
      : { count: null };

  let attendanceToMarkToday: string | null = null;
  if (role === "staff") {
    const { data: assigned } = await supabase
      .from("class_teachers")
      .select("class_id, section_id")
      .eq("staff_id", user!.id);
    const assignedPairs = assigned ?? [];
    if (assignedPairs.length > 0) {
      const { data: markedToday } = await supabase
        .from("attendance_batches")
        .select("class_id, section_id")
        .eq("attendance_date", today)
        .in(
          "class_id",
          assignedPairs.map((p) => p.class_id)
        );
      const markedKeys = new Set((markedToday ?? []).map((m) => `${m.class_id}:${m.section_id}`));
      const remaining = assignedPairs.filter((p) => !markedKeys.has(`${p.class_id}:${p.section_id}`));
      attendanceToMarkToday = `${remaining.length} of ${assignedPairs.length}`;
    } else {
      attendanceToMarkToday = "0 of 0";
    }
  }

  let attendancePresentRate: string | null = null;
  if (role === "student") {
    const { data: records } = await supabase
      .from("attendance_records")
      .select("status")
      .eq("student_id", user!.id)
      .gte("attendance_date", monthStart)
      .lte("attendance_date", today);
    const rows = records ?? [];
    if (rows.length > 0) {
      const presentLike = rows.filter((r) => r.status === "present" || r.status === "late").length;
      attendancePresentRate = `${Math.round((presentLike / rows.length) * 100)}%`;
    } else {
      attendancePresentRate = "—";
    }
  }

  let feeStatus: string | null = null;
  if (role === "student") {
    const lines = await getStudentFeeLines(supabase, user!.id);
    feeStatus = lines.length > 0 ? `₹${lines.reduce((sum, l) => sum + l.outstanding, 0).toFixed(0)}` : "—";
  }

  let noticesCount: string | null = null;
  let latestNotices: { id: string; title: string; publish_date: string }[] = [];
  if (role === "staff" || role === "student") {
    const { data: notices, count } = await supabase
      .from("notices")
      .select("id, title, publish_date", { count: "exact" })
      .lte("publish_date", today)
      .order("publish_date", { ascending: false })
      .limit(3);
    noticesCount = String(count ?? 0);
    latestNotices = notices ?? [];
  }

  let pendingFeesTotal: string | null = null;
  let todaysCollection: string | null = null;
  let monthlyCollection: string | null = null;
  let newAdmissions: string | null = null;
  let recentPayments: { name: string; amount: number; paid_at: string; fee_head: string }[] = [];
  let classStrength: { class: string; students: number }[] = [];
  let collectionTrend: { month: string; total: number }[] = [];
  let admissionComparison: { session: string; current: number; previous: number }[] = [];
  let studentSessionData: { session: string; new: number; old: number }[] = [];
  let staffSessionTrend: { session: string; newStaff: number; existingStaff: number; total: number }[] = [];
  let websiteStats: { label: string; count: number; updated: string }[] = [];
  let todayAttendance = "0%";

  if (role === "super_admin") {
    const [{ data: pendingTotal }, { data: todayPayments }, { data: monthPayments }, { count: admissionsCount }] =
      await Promise.all([
        supabase.rpc("total_outstanding_fees"),
        supabase.from("payments").select("amount").eq("status", "paid").gte("paid_at", today).lte("paid_at", `${today}T23:59:59`),
        supabase.from("payments").select("amount").eq("status", "paid").gte("paid_at", monthStart),
        supabase.from("students").select("*", { count: "exact", head: true }).gte("admission_date", monthStart),
      ]);

    pendingFeesTotal = pendingTotal != null ? `₹${Number(pendingTotal).toFixed(0)}` : "—";
    todaysCollection = `₹${(todayPayments ?? []).reduce((s, p) => s + Number(p.amount), 0).toFixed(0)}`;
    monthlyCollection = `₹${(monthPayments ?? []).reduce((s, p) => s + Number(p.amount), 0).toFixed(0)}`;
    newAdmissions = String(admissionsCount ?? 0);

    const { data: recent } = await supabase
      .from("payments")
      .select("amount, paid_at, students(profiles(full_name)), fee_heads(name)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(5);
    recentPayments = ((recent ?? []) as any[]).map((p) => ({
      name: p.students?.profiles?.full_name ?? "",
      amount: Number(p.amount),
      paid_at: p.paid_at,
      fee_head: p.fee_heads?.name ?? "",
    }));

    const [{ data: classes }, { data: students }] = await Promise.all([
      supabase.from("classes").select("id, name").order("sort_order"),
      supabase.from("students").select("class_id").eq("is_active", true),
    ]);
    const [{ data: staffEnrollments }, { data: sessionRows }] = await Promise.all([
      supabase.from("staff_enrollments").select("staff_id, session_id, created_at").order("created_at"),
      supabase.from("academic_sessions").select("id, name").order("start_date"),
    ]);
    const firstSession = new Map<string, string>();
    for (const enrollment of staffEnrollments ?? []) if (!firstSession.has(enrollment.staff_id)) firstSession.set(enrollment.staff_id, enrollment.session_id);
    staffSessionTrend = (sessionRows ?? []).map((session) => { const members = (staffEnrollments ?? []).filter((e) => e.session_id === session.id); const newStaff = members.filter((e) => firstSession.get(e.staff_id) === session.id).length; return { session: session.name, newStaff, existingStaff: members.length - newStaff, total: members.length }; });
    const countByClass = new Map<string, number>();
    for (const s of students ?? []) countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
    classStrength = (classes ?? []).map((c) => ({ class: c.name, students: countByClass.get(c.id) ?? 0 }));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const { data: trendPayments } = await supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("status", "paid")
      .gte("paid_at", sixMonthsAgo.toISOString().slice(0, 10));
    const trendMap = new Map<string, number>();
    for (const p of trendPayments ?? []) {
      if (!p.paid_at) continue;
      const key = p.paid_at.slice(0, 7);
      trendMap.set(key, (trendMap.get(key) ?? 0) + Number(p.amount));
    }
    collectionTrend = [...Array(6)].map((_, i) => {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = d.toISOString().slice(0, 7);
      return { month: d.toLocaleString("default", { month: "short" }), total: trendMap.get(key) ?? 0 };
    });

    const [{ count: galleryCount }, { count: eventCount }, { count: noticeCount }, { data: latestRows }] = await Promise.all([
      supabase.from("gallery_images").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("notices").select("*", { count: "exact", head: true }),
      supabase.from("site_pages").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    ]);
    const latest = latestRows?.[0]?.updated_at ? new Date(latestRows[0].updated_at).toLocaleDateString() : "—";
    websiteStats = [{ label: "Gallery images", count: galleryCount ?? 0, updated: latest }, { label: "Events", count: eventCount ?? 0, updated: latest }, { label: "Notices", count: noticeCount ?? 0, updated: latest }];
    const { data: attendance } = await supabase.from("attendance_records").select("status").eq("attendance_date", today);
    const marked = attendance ?? []; const present = marked.filter((r) => r.status === "present" || r.status === "late").length;
    todayAttendance = marked.length ? `${Math.round((present / marked.length) * 100)}%` : "—";
    const [{ data: admissionSessions }, { data: admissionEnrollments }] = await Promise.all([
      supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }).limit(2),
      supabase.from("student_enrollments").select("session_id"),
    ]);
    const sessions = [...(admissionSessions ?? [])].reverse();
    admissionComparison = sessions.map((session, index) => ({
      session: session.name,
      current: index === sessions.length - 1 ? (admissionEnrollments ?? []).filter((row) => row.session_id === session.id).length : 0,
      previous: index === sessions.length - 2 ? (admissionEnrollments ?? []).filter((row) => row.session_id === session.id).length : 0,
    }));

    // Get new vs old students by session
    const { data: allStudents } = await supabase
      .from("students")
      .select("id, created_at, is_new_student")
      .eq("is_active", true);
    
    const { data: studentEnrollments } = await supabase
      .from("student_enrollments")
      .select("student_id, session_id");

    const studentSessionMap = new Map<string, Set<string>>();
    for (const enrollment of studentEnrollments ?? []) {
      if (!studentSessionMap.has(enrollment.session_id)) {
        studentSessionMap.set(enrollment.session_id, new Set());
      }
      studentSessionMap.get(enrollment.session_id)?.add(enrollment.student_id);
    }

    studentSessionData = (admissionSessions ?? []).reverse().map((session) => {
      const studentsInSession = studentSessionMap.get(session.id) ?? new Set();
      const newCount = (allStudents ?? []).filter(
        (s) => studentsInSession.has(s.id) && s.is_new_student === true
      ).length;
      const oldCount = studentsInSession.size - newCount;
      return {
        session: session.name,
        new: newCount,
        old: oldCount,
      };
    });
  }

  const values: Record<string, string> = {
    "Total Students": studentCount != null ? String(studentCount) : "—",
    "With Admission No": withAdmissionCount != null ? String(withAdmissionCount) : "—",
    "Without Admission No": withoutAdmissionCount != null ? String(withoutAdmissionCount) : "—",
    "My Students": studentCount != null ? String(studentCount) : "—",
    "Total Staff": staffCount != null ? String(staffCount) : "—",
    "Attendance to Mark Today": attendanceToMarkToday ?? "—",
    "Attendance Summary": attendancePresentRate ?? "—",
    "Fee Status": feeStatus ?? "—",
    "Pending Fees": pendingFeesTotal ?? "—",
    "Today's Collection": todaysCollection ?? "—",
    "Monthly Collection": monthlyCollection ?? "—",
    "New Admissions": newAdmissions ?? "—",
    Notices: noticesCount ?? "—",
  };

  return (
    <div>
      <h1 className="max-w-full break-words font-sans text-xl font-extrabold leading-tight tracking-tight text-[#071b41] sm:text-3xl">Welcome, {profile?.full_name}</h1>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-5">
        {widgets.map((w, index) => {
          const colors = [
            { dot: "bg-blue-500", label: "bg-blue-100 text-blue-700" },
            { dot: "bg-green-500", label: "bg-green-100 text-green-700" },
            { dot: "bg-amber-500", label: "bg-amber-100 text-amber-700" },
            { dot: "bg-purple-500", label: "bg-purple-100 text-purple-700" },
            { dot: "bg-red-500", label: "bg-red-100 text-red-700" },
          ];
          const color = colors[index % 5];
          
          return (
            <Card key={w} className="min-w-0 rounded-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-2 sm:p-3 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${color.label}`}>
                    <DashboardMetricIcon name={w} />
                  </div>
                  <p className="text-xs font-semibold text-gray-600 truncate flex-1">{w}</p>
                </div>
              </div>
              <p className="mt-2 font-display text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{values[w] ?? "—"}</p>
              <p className="mt-0.5 text-xs text-gray-500">{w === "With Admission No" ? "Assigned" : w === "Without Admission No" ? "Pending" : w === "Total Students" ? "Active" : "Summary"}</p>
            </Card>
          );
        })}
      </div>

      {(role === "staff" || role === "student") && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate/50">Latest Notices</p>
            <Link href="/notices">
              <Button variant="ghost">View all →</Button>
            </Link>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {latestNotices.map((n) => (
              <li key={n.id} className="flex items-center justify-between border-b border-ink-100 pb-2 last:border-0">
                <span className="text-slate">{n.title}</span>
                <span className="text-slate/50">{n.publish_date}</span>
              </li>
            ))}
            {latestNotices.length === 0 && <li className="text-slate/50">No notices yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-slate/40">Opens the public notices page — you&apos;ll leave the dashboard.</p>
        </Card>
      )}

      {role === "super_admin" && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ClassStrengthChart data={classStrength} />
            <CollectionTrendChart data={collectionTrend} />
            <AdmissionComparisonChart data={admissionComparison} />
            <StudentSessionChart data={studentSessionData} />
            <StaffSessionChart data={staffSessionTrend} />
            <Card><p className="text-xs uppercase tracking-wide text-slate/50">Today&apos;s attendance</p><p className="mt-2 font-display text-4xl text-ink-700">{todayAttendance}</p><p className="mt-1 text-sm text-slate/60">Present and late students / marked attendance</p></Card>
          </div>
          <Card className="mt-6 border-[#d5e2f7] bg-[#f1f6ff] shadow-[0_8px_24px_rgba(30,42,74,0.06)]"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#1261e8]">Website content</p><p className="mt-1 text-sm text-[#60749a]">Content published across the public website</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1261e8] shadow-sm">LIVE</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{websiteStats.map((item, index) => <div key={item.label} className="rounded-xl border border-[#d5e2f7] bg-white/80 p-3"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef4ff] text-sm font-bold text-[#1261e8]">{["▦", "◉", "! "][index]}</span><span className="text-xs font-semibold text-[#60749a]">Live</span></div><p className="mt-3 truncate text-xs font-bold uppercase tracking-wide text-[#60749a]">{item.label}</p><p className="mt-0.5 font-sans text-2xl font-extrabold text-[#071b41]">{item.count}</p><p className="mt-1 truncate text-[10px] text-[#60749a]">Updated {item.updated}</p></div>)}</div></Card>

          <Card className="mt-6">
            <p className="text-xs uppercase tracking-wide text-slate/50">Recent Payments</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                  <th className="py-2">Student</th>
                  <th className="py-2">Fee Head</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.fee_head}</td>
                    <td className="py-2 font-mono">₹{p.amount.toFixed(2)}</td>
                    <td className="py-2 text-slate/70">{new Date(p.paid_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate/50">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
