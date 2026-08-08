import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExportCsvButton } from "./export-csv-button";
import { ExportExcelButton, type ExportRow } from "./export-excel-button";
import { ExportPdfButton } from "./export-pdf-button";
import { StaffFilters } from "./staff-filters";
import { StaffTable, type StaffRow } from "./staff-table";

const PAGE_SIZE = 10;

export default async function StaffPage({
  searchParams,
}: {
    searchParams: { q?: string; status?: string; page?: string };
}) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");
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

  let query = admin
    .from("staff")
    .select("*, profiles!staff_id_fkey(full_name)", { count: "exact" })
    .order("employee_id");

  if (searchParams.q) {
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`employee_id.ilike.%${q}%,department.ilike.%${q}%,designation.ilike.%${q}%`);
    // Same limitation as the students list: name lives on the joined
    // `profiles` table, which .or() can't reach directly.
  }
  if (searchParams.status === "active") query = query.eq("is_active", true);
  if (searchParams.status === "inactive") query = query.eq("is_active", false);

  const { data: staff, count } = await query.range(from, to);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = await Promise.all(
    (staff ?? []).map(async (s) => {
      const { data: signed } = s.photo_path
        ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10)
        : { data: null };
      return { ...s, photo_url: signed?.signedUrl ?? null };
    }),
  ) as unknown as StaffRow[];
  const { data: allStaff } = await admin.from("staff").select("*, profiles!staff_id_fkey(full_name)").order("employee_id");
  const totalStaff = allStaff?.length ?? 0;
  const activeStaff = (allStaff ?? []).filter((member) => member.is_active).length;
  const inactiveStaff = totalStaff - activeStaff;
  const exportRows = await Promise.all((allStaff ?? []).map(async (s) => {
    const { data: signed } = s.photo_path ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10) : { data: null };
    const fullName = (s.profiles?.full_name ?? "").replace(/(^|\s)(\S)/g, (_match: string, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
    return { ...s, full_name: fullName, photo_url: signed?.signedUrl ?? null };
  })) as ExportRow[];

  return (
    <div>
      <div className="rounded-xl border border-ink-100 bg-white/80 px-2.5 py-2.5 shadow-sm sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl text-ink-700">Staff</h1>
            <p className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-slate/70">
              {count ?? 0} staff member{count === 1 ? "" : "s"}
            </p>
          </div>
          <Link href="/staff/new">
            <Button>Add Staff</Button>
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-ink-100 pt-2 sm:mt-3 sm:gap-3 sm:pt-3">
          <div className="h-16 rounded-xl border border-ink-100 bg-white px-2 py-1 shadow-sm sm:h-auto sm:px-4 sm:py-2">
            <p className="flex items-center gap-1.5 text-[10px] leading-tight text-slate/70 sm:gap-2 sm:text-xs"><span className="h-2 w-2 rounded-full bg-ink-700 sm:h-2.5 sm:w-2.5" />Total staff</p>
            <p className="mt-0.5 text-base font-bold text-ink-700 sm:mt-1 sm:text-xl">{totalStaff}</p>
          </div>
          <div className="h-16 rounded-xl border border-ink-100 bg-white px-2 py-1 shadow-sm sm:h-auto sm:px-4 sm:py-2">
            <p className="flex items-center gap-1.5 text-[10px] leading-tight text-slate/70 sm:gap-2 sm:text-xs"><span className="h-2 w-2 rounded-full bg-emerald-500 sm:h-2.5 sm:w-2.5" />Active staff</p>
            <p className="mt-0.5 text-base font-bold text-ink-700 sm:mt-1 sm:text-xl">{activeStaff}</p>
          </div>
          <div className="h-16 rounded-xl border border-ink-100 bg-white px-2 py-1 shadow-sm sm:h-auto sm:px-4 sm:py-2">
            <p className="flex items-center gap-1.5 text-[10px] leading-tight text-slate/70 sm:gap-2 sm:text-xs"><span className="h-2 w-2 rounded-full bg-red-500 sm:h-2.5 sm:w-2.5" />Inactive staff</p>
            <p className="mt-0.5 text-base font-bold text-ink-700 sm:mt-1 sm:text-xl">{inactiveStaff}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="mr-1 shrink-0 text-sm font-semibold text-ink-700">Export</p>
          <ExportCsvButton
            rows={exportRows}
          />
          <ExportExcelButton
            rows={exportRows}
          />
          <ExportPdfButton rows={exportRows} />
          </div>
          <StaffFilters showFilterButton={false} />
        </div>
      </div>

      <div className="mt-0">
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
