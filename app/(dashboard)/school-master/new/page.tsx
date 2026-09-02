import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { SchoolForm } from "../school-form";

export default async function NewSchoolPage({ searchParams }: { searchParams: { organization?: string } }) {
  let role: string;
  try { ({ role } = await requirePageAccess("school_master")); } catch { redirect("/dashboard"); }
  const supabase = await createClient();
  const dataClient = role === "super_admin" ? createAdminClient() : supabase;
  let organizationsQuery = dataClient.from("organizations").select("id,name,code,is_active").order("name");
  if (role !== "super_admin") organizationsQuery = organizationsQuery.eq("is_active", true);
  const { data: organizations } = await organizationsQuery;
  const selectedOrganization = searchParams.organization ? (organizations ?? []).find((organization) => organization.id === searchParams.organization) : null;
  return <div className="-mx-2 -mt-2 min-w-0 space-y-0 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2.5 shadow-sm sm:px-4">
      <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#24345f] text-lg text-white shadow-sm">⌂</div><div className="min-w-0"><h1 className="truncate font-display text-xl font-semibold text-ink-700 sm:text-2xl">Add School / Branch</h1><p className="mt-1 truncate text-sm text-slate/60">Create a school under the selected organization.</p></div></div>
      <div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-ink-700">New school</span>{selectedOrganization && <Link href={`/organization-master/${selectedOrganization.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-[#24345f] bg-[#24345f] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1b294f]">← Back to Organization</Link>}</div>
    </div>
    <SchoolForm organizations={organizations ?? []} fixedOrganizationId={selectedOrganization?.id} initial={selectedOrganization ? { organization_id: selectedOrganization.id, name: "", code: "", slug: "", is_active: true } : undefined} />
  </div>;
}
