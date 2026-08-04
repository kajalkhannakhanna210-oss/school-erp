import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "./export-csv-button";
import { StudentFilters } from "./student-filters";
import { StudentTable, type StudentRow } from "./student-table";
import { BulkStudentUpdate } from "./bulk-update";

const PAGE_SIZE = 10;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; class?: string; section?: string; admission?: string; page?: string };
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
    .select("*, profiles(full_name), classes(name), sections(name)", { count: "exact" })
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

  const [{ data: classes }, { data: sections }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
    supabase.from("academic_sessions").select("id, name").order("start_date", { ascending: false }),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (students ?? []) as unknown as StudentRow[];

  return (
    <div>
      <div className="flex flex-col gap-2 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Student directory</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700">Students</h1>
          <p className="text-xs text-slate/60">
            {count ?? 0} student{count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ExportCsvButton
            rows={rows.map((s) => ({
              admission_number: s.admission_number,
              roll_number: s.roll_number,
              full_name: s.profiles?.full_name ?? "",
              class_name: s.classes?.name ?? null,
              section_name: s.sections?.name ?? null,
              mobile_number: s.mobile_number,
            }))}
          />
          {canManage && (
            <>
              <BulkStudentUpdate ids={rows.map((student) => student.id)} classes={classes ?? []} sections={sections ?? []} sessions={sessions ?? []} />
            <Link href="/students/promote">
              <Button variant="ghost" className="border border-ink-100 bg-ink-50">Promote students</Button>
            </Link>
            <Link href="/students/admission-allotment">
              <Button variant="ghost" className="border border-ink-100 bg-ink-50">Admission allotment</Button>
            </Link>
              <Link href="/students/new">
              <Button>Add student</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-ink-100 bg-ink-50/50 px-2.5 py-1.5 shadow-sm sm:px-3">
        <StudentFilters classes={classes ?? []} sections={sections ?? []} />
      </div>

      <div className="mt-6">
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
