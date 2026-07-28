import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "./export-csv-button";
import { StudentFilters } from "./student-filters";
import { StudentTable, type StudentRow } from "./student-table";

const PAGE_SIZE = 20;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; class?: string; section?: string; page?: string };
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
  if (searchParams.q) {
    // Strip characters that have special meaning in a PostgREST filter string.
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`admission_number.ilike.%${q}%,mobile_number.ilike.%${q}%`);
    // Name lives on the joined `profiles` table, which .or() can't filter on
    // directly — worth a `students_search` view or RPC if name search matters
    // more than admission number / mobile.
  }

  const { data: students, count } = await query.range(from, to);

  const [{ data: classes }, { data: sections }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("sections").select("id, name, class_id").order("name"),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (students ?? []) as unknown as StudentRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink-700">Students</h1>
          <p className="mt-1 text-sm text-slate/60">
            {count ?? 0} student{count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              <Link href="/students/promote">
                <Button variant="ghost">Promote</Button>
              </Link>
              <Link href="/students/new">
                <Button>Add Student</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
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
