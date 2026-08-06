import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "./export-csv-button";
import { StudentFilters } from "./student-filters";
import { StudentTable, type StudentRow } from "./student-table";
import { BulkStudentUpdate } from "./bulk-update";
import { StudentDirectoryMenu, StudentDirectoryMenuItem } from "./student-directory-menu";
import { StudentFilterToggle } from "./student-filter-toggle";

const PAGE_SIZE = 10;
export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
    searchParams: { q?: string; class?: string; section?: string; admission?: string; page?: string; filters?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canManage = profile?.role === "super_admin";

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("students")
    .select("id, admission_number, roll_number, mobile_number, is_active, photo_path, profiles(full_name), classes(name), sections(name)", { count: "exact" })
    .order("admission_number");

  if (searchParams.class) query = query.eq("class_id", searchParams.class);
  if (searchParams.section) query = query.eq("section_id", searchParams.section);
  if (searchParams.admission === "assigned") query = query.not("admission_number", "is", null);
  if (searchParams.admission === "unassigned") query = query.is("admission_number", null);
  if (searchParams.q) {
    // Strip characters that have special meaning in a PostgREST filter string.
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`admission_number.ilike.%${q}%,mobile_number.ilike.%${q}%`);
    // Name lives on the joined `profiles` table, which .or() can't filter on
    // directly — worth a `students_search` view or RPC if name search matters
    // more than admission number / mobile.
  }

  const { data: students, count } = await query.range(from, to);

  const [{ data: classes }, { data: sections }, { data: sessions }, { count: assignedCount }, { count: unassignedCount }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
    supabase.from("students").select("id", { count: "exact", head: true }).not("admission_number", "is", null).neq("admission_number", ""),
    supabase.from("students").select("id", { count: "exact", head: true }).or("admission_number.is.null,admission_number.eq."),
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
            <StudentDirectoryMenuItem>
              <ExportCsvButton rows={rows.map((s) => ({ admission_number: s.admission_number, roll_number: s.roll_number, full_name: s.profiles?.full_name ?? "", class_name: s.classes?.name ?? null, section_name: s.sections?.name ?? null, mobile_number: s.mobile_number }))} />
            </StudentDirectoryMenuItem>
            {canManage && <>
              <StudentDirectoryMenuItem><BulkStudentUpdate ids={rows.map((student) => student.id)} classes={classes ?? []} sections={sections ?? []} sessions={sessions ?? []} /></StudentDirectoryMenuItem>
              <StudentDirectoryMenuItem><Link className="block py-2" href="/students/promote">Promote students</Link></StudentDirectoryMenuItem>
              <StudentDirectoryMenuItem><Link className="block py-2" href="/students/admission-allotment">Admission Allotment</Link></StudentDirectoryMenuItem>
            </>}
          </StudentDirectoryMenu>
          {canManage && (
            <>
              <Link href="/students/new" className="min-w-0">
              <Button className="h-10 min-h-10 w-full whitespace-nowrap px-2 text-xs sm:min-w-[150px] sm:w-auto sm:px-4 sm:text-sm">Add student</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid max-w-lg grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2.5 py-2 shadow-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium leading-tight text-slate/60">Total students</p>
            <p className="mt-0.5 text-base font-bold leading-none text-ink-700">{count ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2.5 py-2 shadow-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium leading-tight text-slate/60">With admission no.</p>
            <p className="mt-0.5 text-base font-bold leading-none text-ink-700">{assignedCount ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2.5 py-2 shadow-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium leading-tight text-slate/60">Without admission no.</p>
            <p className="mt-0.5 text-base font-bold leading-none text-ink-700">{unassignedCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg border-0 bg-transparent px-0 py-0 shadow-none sm:border sm:border-ink-100 sm:bg-ink-50/50 sm:px-3 sm:py-1.5 sm:shadow-sm">
        <StudentFilters classes={classes ?? []} sections={sections ?? []} />
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
