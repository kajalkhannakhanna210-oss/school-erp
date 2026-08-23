import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { StaffAssignmentRulesTable } from "./staff-assignment-rules-table";

export default async function StaffAssignmentRulesPage() {
  try {
    await requirePageAccess("staff_assignment_rules");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch all staff
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, email, mobile_number, status")
    .order("full_name");

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
    .select("staff_id, resource_id, scope_type")
    .eq("module_key", "admission_enquiry")
    .eq("scope_type", "CLASS");

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

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-1 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-4 py-3 shadow-sm">
        <p className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700 sm:block">
          Admission Management
        </p>
        <h1 className="font-display text-lg font-semibold text-ink-700 sm:text-xl">
          Staff Assignment Rules
        </h1>
        <p className="text-sm text-slate-600">
          Assign designated classes to admission staff members for enquiry management.
        </p>
      </div>

      <div className="mt-4">
        <StaffAssignmentRulesTable staff={staff ?? []} classes={classes ?? []} staffClassMap={staffClassMap} />
      </div>
    </div>
  );
}
