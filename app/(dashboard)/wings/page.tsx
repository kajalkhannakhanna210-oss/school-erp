import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { WingMasterClient } from "./wing-master-client";

export default async function WingsPage({ searchParams }: { searchParams?: { schoolId?: string } }) {
  try { await requirePageAccess("wing_master"); } catch { redirect("/dashboard"); }
  const context = await getMasterDataContext();
  const supabase = await createClient();
  const schoolIds = context.schools.map((school) => school.id);
  const wingSelect = "id, organization_id, school_id, wing_code, wing_name, description, display_order, is_active, wing_admission_policies(prefix,suffix,starting_number,current_number,number_length,separator,include_academic_year,academic_year_format,reset_policy,is_active)";
  const { data: wings } = schoolIds.length ? await supabase.from("school_wings").select(wingSelect).in("school_id", schoolIds).order("display_order") : { data: [] };
  const { data: classes } = schoolIds.length ? await supabase.from("classes").select("id, wing_id, school_id").in("school_id", schoolIds) : { data: [] };
  const rows = (wings ?? []).map((wing: any) => ({
    ...wing,
    policy: Array.isArray(wing.wing_admission_policies) ? wing.wing_admission_policies[0] ?? null : wing.wing_admission_policies ?? null,
    class_count: (classes ?? []).filter((item: any) => item.wing_id === wing.id).length,
  }));
  const schoolSummaries = context.schools.map((school) => {
    const schoolWings = rows.filter((wing: any) => wing.school_id === school.id);
    const schoolClasses = (classes ?? []).filter((item: any) => item.school_id === school.id);
    return { ...school, total_wings: schoolWings.length, active_wings: schoolWings.filter((wing: any) => wing.is_active).length, inactive_wings: schoolWings.filter((wing: any) => !wing.is_active).length, class_count: schoolClasses.length, mapped_classes: schoolClasses.filter((item: any) => item.wing_id).length, configured_policies: schoolWings.filter((wing: any) => wing.policy?.is_active).length };
  });
  const requestedSchool = context.schools.find((school) => school.id === searchParams?.schoolId);
  const initialSchoolId = context.loginScope === "school" ? context.schoolId : requestedSchool?.id ?? null;
  const initialOrganizationId = context.loginScope === "organization" ? context.organizationId : requestedSchool?.organization_id ?? null;
  return <div className="wing-master-page -mx-2 -mt-2 min-w-0 space-y-3 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4"><div className="rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-4 py-2.5 shadow-sm"><h1 className="font-display text-xl font-semibold text-ink-700">Wing Master</h1><p className="mt-0.5 text-sm text-slate/60">Manage school wings and wing-wise admission number policies.</p></div><WingMasterClient wings={rows} schools={context.schools} organizations={context.organizations} summaries={schoolSummaries} initialSchoolId={initialSchoolId} initialOrganizationId={initialOrganizationId} loginScope={context.loginScope} /></div>;
}
