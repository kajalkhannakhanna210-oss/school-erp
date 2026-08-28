import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { requirePageAccess } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { canAccessEnquiryAction, getUserActionScope, userHasPermission } from "@/lib/enquiries-server";
import { EnquiryForm } from "./form";
import { NewEnquiryViewport } from "./new-enquiry-viewport";

export const dynamic = "force-dynamic";

export default async function NewEnquiryPage() {
  try {
    await requirePageAccess("enquiries");
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: authUser } = await supabase.auth.getUser();
  if (!(await canAccessEnquiryAction(supabase, authUser.user?.id, "create"))) {
    redirect("/enquiries");
  }
  const [{ data: classes }, { data: sessions }, { data: activeStaff }, { data: staffScopes }] = await Promise.all([
    supabase.from("classes").select("id, name").order("sort_order"),
    supabase.from("academic_sessions").select("id, name, is_current").order("start_date", { ascending: false }),
    supabase.from("staff").select("id, is_active, profiles!staff_id_fkey(full_name)").eq("is_active", true),
    supabase.from("staff_module_scopes").select("staff_id, scope_type, resource_id, action_key").eq("module_key", "admission_enquiry"),
  ]);

  const scopeByStaff = new Map<string, { all: boolean; classes: string[] }>();
  for (const row of staffScopes ?? []) {
    if (row.action_key && row.action_key !== "ALL" && row.action_key !== "followup") continue;
    const current = scopeByStaff.get(row.staff_id) ?? { all: false, classes: [] };
    if (row.scope_type === "ALL") current.all = true;
    if (row.scope_type === "CLASS" && row.resource_id) current.classes.push(String(row.resource_id));
    scopeByStaff.set(row.staff_id, current);
  }
  const staffList = (activeStaff ?? [])
    .filter((staff: any) => scopeByStaff.has(staff.id))
    .map((staff: any) => ({
      id: staff.id,
      full_name: staff.profiles?.full_name ?? "Unnamed staff",
      designated_classes: scopeByStaff.get(staff.id)?.classes ?? [],
      has_all_scope: scopeByStaff.get(staff.id)?.all ?? false,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Only expose classes the current user can create enquiries for. The server
  // action performs the same check again because client-side filtering is not
  // an authorization boundary.
  let createClasses = classes ?? [];
  if (authUser.user) {
    const hasCreatePermission = await userHasPermission(supabase, authUser.user.id, "admission_enquiry.create");
    const createScope = await getUserActionScope(supabase, authUser.user.id, "create");
    if (!hasCreatePermission || !createScope.all) {
      createClasses = hasCreatePermission
        ? createClasses.filter((c) => createScope.classes.includes(String(c.id)))
        : [];
    }
  } else {
    createClasses = [];
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden lg:h-[calc(100dvh-7rem)]">
      <NewEnquiryViewport />
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700 sm:text-2xl">Record New Admission Enquiry</h1>
          <p className="mt-0.5 text-xs text-slate/70">Capture a new admission enquiry and route it to the right staff member.</p>
        </div>
        <Link href="/enquiries" className="shrink-0">
          <Button variant="outline" className="h-10 px-4 text-sm font-semibold shadow-sm">← Admission Enquiries</Button>
        </Link>
      </div>

      <EnquiryForm
        classes={createClasses}
        sessions={sessions ?? []}
        staffList={staffList}
      />
    </div>
  );
}
