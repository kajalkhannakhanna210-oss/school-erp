import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { ExportCsvButton } from "./export-csv-button";
import { ExportExcelButton, type ExportRow } from "./export-excel-button";
import { ExportPdfButton } from "./export-pdf-export";
import { StaffFilters } from "./staff-filters";
import { StaffTable, type StaffRow } from "./staff-table";

const PAGE_SIZE = 10;

import { getSelectedSessionCookie } from "../session-actions";

export default async function StaffPage({
  searchParams,
}: {
    searchParams: { q?: string; status?: string; page?: string; session?: string };
}) {
  try {
    await requirePageAccess("staff");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const selectedSessionId = searchParams.session || (await getSelectedSessionCookie());
  const admin = createAdminClient();

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let enrollmentIds: string[] | null = null;
  let enrollmentStatus = new Map<string, boolean>();
  if (selectedSessionId) {
    const { data: enrollments } = await admin.from("staff_enrollments").select("staff_id, is_active").eq("session_id", selectedSessionId);
    enrollmentIds = (enrollments ?? []).map((row) => row.staff_id);
    enrollmentStatus = new Map((enrollments ?? []).map((row) => [row.staff_id, row.is_active]));
  }

  let query = admin
    .from("staff")
    .select("*, profiles!staff_id_fkey(full_name)", { count: "exact" })
    .order("employee_id");
  if (selectedSessionId) {
    query = enrollmentIds?.length ? query.in("id", enrollmentIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (searchParams.q) {
    const q = searchParams.q.replace(/[,()]/g, "");
    query = query.or(`employee_id.ilike.%${q}%,department.ilike.%${q}%,designation.ilike.%${q}%`);
  }
  if (searchParams.status === "active" && !selectedSessionId) query = query.eq("is_active", true);
  if (searchParams.status === "inactive" && !selectedSessionId) query = query.eq("is_active", false);

  const { data: staff, count } = await query.range(from, to);
  const sessionStaff = selectedSessionId
    ? (staff ?? []).filter((member) => searchParams.status === "active" ? enrollmentStatus.get(member.id) : searchParams.status === "inactive" ? !enrollmentStatus.get(member.id) : true)
    : (staff ?? []);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = await Promise.all(
    sessionStaff.map(async (s) => {
      const { data: signed } = s.photo_path
        ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10)
        : { data: null };
      return { ...s, photo_url: signed?.signedUrl ?? null };
    }),
  ) as unknown as StaffRow[];
  let allStaffQuery = admin.from("staff").select("*, profiles!staff_id_fkey(full_name)").order("employee_id");
  if (selectedSessionId) {
    allStaffQuery = enrollmentIds?.length ? allStaffQuery.in("id", enrollmentIds) : allStaffQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: allStaff } = await allStaffQuery;
  const totalStaff = allStaff?.length ?? 0;
  const activeStaff = (allStaff ?? []).filter((member) => member.is_active).length;
  const inactiveStaff = totalStaff - activeStaff;
  const exportRows = await Promise.all((allStaff ?? []).map(async (s: any) => {
    const { data: signed } = s.photo_path ? await admin.storage.from("staff-photos").createSignedUrl(s.photo_path, 60 * 10) : { data: null };
    const fullName = (s.profiles?.full_name ?? "").replace(/(^|\s)(\S)/g, (_match: string, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
    return { ...s, full_name: fullName, photo_url: signed?.signedUrl ?? null };
  })) as ExportRow[];

  // Unique departments count
  const departmentCount = new Set((allStaff ?? []).map((s: any) => s.department).filter(Boolean)).size;

  const getStatusHref = (statusValue?: string) => {
    const p = { ...searchParams };
    delete p.page;
    if (statusValue) p.status = statusValue;
    else delete p.status;
    const s = new URLSearchParams(p as any).toString();
    return `/staff${s ? `?${s}` : ''}`;
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* Header Banner */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Staff Management</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700 sm:text-2xl">Staff Directory</h1>
          <p className="mt-0.5 text-xs text-slate/70">
            Overview of employee records, departments, designations, and account status.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/staff/session-management">
            <Button variant="outline" className="h-10 px-3 text-xs font-semibold sm:text-sm">Session Assignment</Button>
          </Link>
          <Link href="/staff/new">
            <Button className="h-10 px-4 text-sm font-semibold shadow-sm">+ Add Staff Member</Button>
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Link
          href={getStatusHref()}
          className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-white p-3.5 transition-all duration-200 hover:shadow-md ${
            !searchParams.status ? "border-ink-700 bg-ink-50/20 shadow-md" : "border-ink-100 hover:border-ink-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-700">Total Staff</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-100 text-ink-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{totalStaff}</p>
          <p className="mt-1 text-[10px] text-slate/60">All employee records</p>
        </Link>

        <Link
          href={getStatusHref("active")}
          className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-white p-3.5 transition-all duration-200 hover:shadow-md ${
            searchParams.status === "active" ? "border-emerald-500 bg-emerald-50/20 shadow-md" : "border-ink-100 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Staff</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{activeStaff}</p>
          <p className="mt-1 text-[10px] text-emerald-700">Active employees</p>
        </Link>

        <Link
          href={getStatusHref("inactive")}
          className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-white p-3.5 transition-all duration-200 hover:shadow-md ${
            searchParams.status === "inactive" ? "border-rose-500 bg-rose-50/20 shadow-md" : "border-ink-100 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Inactive Staff</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{inactiveStaff}</p>
          <p className="mt-1 text-[10px] text-rose-700">Archived/Inactive</p>
        </Link>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-ink-100 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate/70">Departments</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate/70">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V9a2 2 0 012-2h2a2 2 0 012 2v12" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{departmentCount}</p>
          <p className="mt-1 text-[10px] text-slate/60">Active departments</p>
        </div>
      </div>

      {/* Control Bar: Search & Export */}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <StaffFilters showFilterButton={false} />
        <div className="flex items-center gap-2 border-t border-ink-100 pt-2.5 sm:border-t-0 sm:pt-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate/60">Export:</span>
          <ExportCsvButton rows={exportRows} />
          <ExportExcelButton rows={exportRows} />
          <ExportPdfButton rows={exportRows} />
        </div>
      </div>

      {/* Staff Table Component */}
      <div className="mt-2">
        <StaffTable staff={rows} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/staff", query: { ...searchParams, page: p } }}
              className={`min-w-9 rounded-lg px-3 py-1.5 text-center font-semibold transition ${
                p === page ? "bg-ink-700 text-white shadow-sm" : "bg-white text-ink-700 hover:bg-ink-50 border border-ink-100"
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
