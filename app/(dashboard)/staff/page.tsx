import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvButton } from "./export-csv-button";
import { StaffFilters } from "./staff-filters";
import { StaffTable, type StaffRow } from "./staff-table";

const PAGE_SIZE = 20;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // Staff Management is Super-Admin-only — unlike Students, there's no
  // "view_staff" permission or class-teacher-style exception.
  if (viewerProfile?.role !== "super_admin") redirect("/dashboard");

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("staff")
    .select("*, profiles(full_name)", { count: "exact" })
    .order("employee_id");

  if (searchParams.q) {
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`employee_id.ilike.%${q}%,department.ilike.%${q}%,designation.ilike.%${q}%`);
    // Same limitation as the students list: name lives on the joined
    // `profiles` table, which .or() can't reach directly.
  }

  const { data: staff, count } = await query.range(from, to);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (staff ?? []) as unknown as StaffRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink-700">Staff</h1>
          <p className="mt-1 text-sm text-slate/60">
            {count ?? 0} staff member{count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            rows={rows.map((s) => ({
              employee_id: s.employee_id,
              full_name: s.profiles?.full_name ?? "",
              department: s.department,
              designation: s.designation,
              mobile_number: s.mobile_number,
            }))}
          />
          <Link href="/staff/new">
            <Button>Add Staff</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <StaffFilters />
      </div>

      <div className="mt-6">
        <StaffTable staff={rows} />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/staff", query: { ...searchParams, page: p } }}
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
