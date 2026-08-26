import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { StaffAssignmentRulesTable } from "./staff-assignment-rules-table";

export const dynamic = "force-dynamic";

export default async function StaffAssignmentRulesPage() {
  try {
    await requirePageAccess("staff_assignment_rules");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch all staff with profile names
  const { data: rawStaff } = await supabase
    .from("staff")
    .select("id, contact_email, mobile_number, is_active, profiles!staff_id_fkey(full_name)");

  const staff = (rawStaff ?? []).map((s: any) => ({
    id: s.id,
    full_name: (s.profiles?.full_name ?? "Unnamed Staff").replace(/(^|\s)(\S)/g, (_match: string, space: string, letter: string) => `${space}${letter.toUpperCase()}`),
    email: s.contact_email ?? "",
    mobile_number: s.mobile_number,
    status: s.is_active ? "active" : "inactive",
  })).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

  // Fetch all classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, sort_order")
    .order("sort_order");

  // Fetch staff_module_scopes for admission_enquiry with CLASS scope type
  // FUTURE: This query can be extended to also fetch SECTION scope type
  // when section-level admission enquiry assignments are needed.
  // The staff_module_scopes table already supports:
  //   - scope_type = 'CLASS' (current) → resource_id = class_id
  //   - scope_type = 'SECTION' (future) → resource_id = section_id
  //   - scope_type = 'ALL' (admin) → resource_id = null
  const { data: scopes } = await supabase
    .from("staff_module_scopes")
    .select("staff_id, resource_id, scope_type, action_key")
    .eq("module_key", "admission_enquiry");

  // Build staff -> classes mapping
  const staffClassMap = new Map<string, string[]>();
  (staff ?? []).forEach((s) => {
    staffClassMap.set(s.id, []);
  });
  (scopes ?? []).forEach((scope) => {
    const classIds = staffClassMap.get(scope.staff_id) || [];
    if (scope.resource_id) {
      classIds.push(scope.resource_id);
    }
    staffClassMap.set(scope.staff_id, classIds);
  });

  const totalStaffCount = staff.length;
  const totalClassesCount = classes?.length ?? 0;
  const assignedStaffCount = staff.filter((s) => (staffClassMap.get(s.id)?.length ?? 0) > 0).length;
  const unassignedStaffCount = totalStaffCount - assignedStaffCount;

  return (
    <div className="min-w-0 space-y-4">
      {/* Header Banner */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Admission Management</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700 sm:text-2xl">Staff Assignment Rules</h1>
          <p className="mt-0.5 text-xs text-slate/70">
            Assign designated classes to admission staff members for enquiry scope management.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/staff">
            <Button variant="outline" className="h-10 px-4 text-sm font-semibold shadow-sm">
              ← Staff Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-700">Staff Members</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-100 text-ink-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{totalStaffCount}</p>
          <p className="mt-1 text-[10px] text-slate/60">Total staff for assignment</p>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Total Classes</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V9a2 2 0 012-2h2a2 2 0 012 2v12" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{totalClassesCount}</p>
          <p className="mt-1 text-[10px] text-amber-700">Available classes</p>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">With Rules</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{assignedStaffCount}</p>
          <p className="mt-1 text-[10px] text-emerald-700">Staff with assigned classes</p>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate/70">Unassigned</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate/70">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-ink-900 sm:text-3xl">{unassignedStaffCount}</p>
          <p className="mt-1 text-[10px] text-slate/60">No classes assigned</p>
        </div>
      </div>

      <div className="mt-2">
        <StaffAssignmentRulesTable staff={staff ?? []} classes={classes ?? []} assignedScopes={(scopes ?? []) as any} />
      </div>
    </div>
  );
}
