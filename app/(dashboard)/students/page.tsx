import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { ExportCsvButton } from "./export-csv-button";
import { StudentFilters } from "./student-filters";
import nextDynamic from "next/dynamic";
import type { StudentRow } from "./student-table";
const StudentTable = nextDynamic(() => import("./student-table").then((mod) => mod.StudentTable), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-48 rounded bg-ink-50" />
        <div className="h-3 w-full rounded bg-ink-50" />
      </div>
    </div>
  ),
});
import { BulkStudentUpdate } from "./bulk-update";
import { StudentDirectoryMenu, StudentDirectoryMenuItem } from "./student-directory-menu";
import { StudentFilterToggle } from "./student-filter-toggle";
import { SummaryCard } from "./summary-card";
import { DeleteAllStudents } from "./delete-all-students";
import { getStudentStats } from "@/lib/students";

const PAGE_SIZE = 10;
export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
    searchParams: { q?: string; class?: string; section?: string; session?: string; admission?: string; page?: string; filters?: string; tab?: string };
}) {
  try {
    await requirePageAccess("students");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canManage = profile?.role === "super_admin";

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let enrollmentStudentIds: string[] | null = null;
  if (searchParams.session) {
    const { data: enrollments } = await supabase.from("student_enrollments").select("student_id").eq("session_id", searchParams.session);
    enrollmentStudentIds = (enrollments ?? []).map((row) => row.student_id);
  }

  let query = supabase
    .from("students")
    .select("*, profiles(full_name), classes(name), sections(name), academic_sessions(name)", { count: "exact" })
    .order("admission_number");

  // Apply session filter FIRST if provided
  if (searchParams.session) {
    query = enrollmentStudentIds?.length ? query.in("id", enrollmentStudentIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  // Apply basic filters
  if (searchParams.class) query = query.eq("class_id", searchParams.class);
  if (searchParams.section) query = query.eq("section_id", searchParams.section);
  if (searchParams.admission === "assigned") query = query.not("admission_number", "is", null).neq("admission_number", "");
  if (searchParams.admission === "unassigned") query = query.or("admission_number.is.null,admission_number.eq.");

  // Tab mappings (category tabs)
  if (searchParams.tab === "new") {
    query = query.or("admission_number.is.null,admission_number.eq.");
  }
  if (searchParams.tab === "admission-assigned") {
    query = query.not("admission_number", "is", null).neq("admission_number", "");
  }
  if (searchParams.tab === "archived") {
    query = query.eq("is_active", false);
  }
  if (searchParams.tab === "left") {
    // find leaving student ids for session (if session provided) or all
    const { data: leaving } = searchParams.session
      ? await supabase.from("student_leaving_requests").select("student_id").eq("status", "student_left").eq("session_id", searchParams.session)
      : await supabase.from("student_leaving_requests").select("student_id").eq("status", "student_left");
    const leftIds = (leaving ?? []).map((r: any) => r.student_id);
    if (leftIds.length === 0) query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    else query = query.in("id", leftIds);
  }

  if (searchParams.q) {
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`admission_number.ilike.%${q}%,mobile_number.ilike.%${q}%`);
    // Name lives on the joined `profiles` table, which .or() can't filter on
    // directly — consider an RPC / search view if name search becomes critical.
  }

  const { data: students, count } = await query.range(from, to);

  // Fetch supporting lists and stats in parallel
  const [{ data: classes }, { data: sections }, { data: sessions }, stats] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name, is_current, start_date").order("start_date", { ascending: false }),
    getStudentStats(supabase, searchParams.session),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = await Promise.all((students ?? []).map(async (student: any) => {
    let photo_url: string | null = null;
    if (student.photo_path) {
      const { data: signed } = await supabase.storage.from("student-photos").createSignedUrl(student.photo_path, 60 * 10);
      photo_url = signed?.signedUrl ?? null;
    }
    return { ...student, photo_url } as StudentRow;
  }));

  // choose default session for filter select if none provided
  const defaultSessionId = (sessions ?? []).find((s: any) => s.is_current)?.id ?? "";

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700 sm:block">Student directory</p>
          <p className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gold-700 sm:hidden">Directory</p>
          <h1 className="mt-0.5 font-display text-lg font-semibold text-ink-700 sm:text-xl">Students</h1>
        </div>
        <div className="grid min-w-0 w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2">
          <StudentFilterToggle />
          <StudentDirectoryMenu>
            <div className="w-full p-1 sm:hidden"><ExportCsvButton rows={rows.map((s: any) => ({ ...s, full_name: s.profiles?.full_name ?? "", class_name: s.classes?.name ?? null, section_name: s.sections?.name ?? null, session_name: s.academic_sessions?.name ?? null, photo_url: s.photo_url }))} /></div>
            {canManage && <>
              <StudentDirectoryMenuItem><BulkStudentUpdate ids={rows.map((student) => student.id)} classes={classes ?? []} sections={sections ?? []} sessions={sessions ?? []} /></StudentDirectoryMenuItem>
              <StudentDirectoryMenuItem><Link className="block py-2" href="/students/promote">Promote students</Link></StudentDirectoryMenuItem>
              <StudentDirectoryMenuItem><Link className="block py-2" href="/students/admission-allotment">Admission Allotment</Link></StudentDirectoryMenuItem>
              <StudentDirectoryMenuItem plain><DeleteAllStudents disabled={!count} /></StudentDirectoryMenuItem>
            </>}
          </StudentDirectoryMenu>
          <div className="col-span-3 hidden justify-end sm:order-last sm:flex sm:w-auto">
            <ExportCsvButton rows={rows.map((s: any) => ({ ...s, full_name: s.profiles?.full_name ?? "", class_name: s.classes?.name ?? null, section_name: s.sections?.name ?? null, session_name: s.academic_sessions?.name ?? null, photo_url: s.photo_url }))} />
          </div>
          {canManage && (
            <>
              <Link href="/students/new" className="min-w-0">
              <Button className="h-10 min-h-10 w-full whitespace-nowrap px-2 text-xs sm:min-w-[150px] sm:w-auto sm:px-4 sm:text-sm">Add student</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-3 items-stretch">
        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "all" }).toString()}`} title="Total students" count={stats.totalStudents} subtitle="All student records" colorClass="bg-ink-700" active={searchParams.tab === "all" || !searchParams.tab} />

        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "new" }).toString()}`} title="New Students" count={stats.newStudents} subtitle="Without Admission Number" colorClass="bg-emerald-500" active={searchParams.tab === "new"} />

        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "admission-assigned" }).toString()}`} title="Adm NO. Assigned" count={stats.studentsWithAdmissionNumber} subtitle="Admission number available" colorClass="bg-amber-500" active={searchParams.tab === "admission-assigned"} />

        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "old" }).toString()}`} title="Old Students" count={stats.oldStudents} subtitle="Existing/old records" colorClass="bg-ink-700" active={searchParams.tab === "old"} />

        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "archived" }).toString()}`} title="Archived" count={stats.archivedStudents} subtitle="Archived student records" colorClass="bg-rose-500" active={searchParams.tab === "archived"} />

        <SummaryCard href={`/students?${new URLSearchParams({ ...searchParams, tab: "left" }).toString()}`} title="Students Left" count={stats.studentsLeft} subtitle="Students who left school" colorClass="bg-slate-500" active={searchParams.tab === "left"} />
      </div>

      <div className="mt-2 rounded-lg border-0 bg-transparent px-0 py-0 shadow-none sm:border sm:border-ink-100 sm:bg-ink-50/50 sm:px-3 sm:py-1.5 sm:shadow-sm">
        <StudentFilters classes={classes ?? []} sections={sections ?? []} sessions={sessions ?? []} defaultSessionId={defaultSessionId} />
      </div>

      <div className="mt-2">
        <StudentTable students={rows} canManage={canManage} />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/students", query: { ...searchParams, page: p } }}
              className={`rounded-md px-3 py-1 ${
                p === page ? "bg-ink-700 text-paper" : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
