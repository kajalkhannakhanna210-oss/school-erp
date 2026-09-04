import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { SchoolForm } from "../school-form";

export default async function NewSchoolPage({ searchParams }: { searchParams: { organization?: string; id?: string } }) {
  let role: string;
  try { ({ role } = await requirePageAccess("school_master")); } catch { redirect("/dashboard"); }
  const context = await getMasterDataContext();
  if (context.loginScope === "school" && searchParams.id !== context.schoolId) redirect(`/school-master/new?id=${context.schoolId}`);
  const supabase = await createClient();
  const dataClient = role === "super_admin" ? createAdminClient() : supabase;
  const [{ data: organizations }, { data: school }, { data: website }] = await Promise.all([
    (role === "super_admin" ? createAdminClient() : supabase).from("organizations").select("id,name,code,is_active").order("name"),
    searchParams.id ? dataClient.from("schools").select("*").eq("id", searchParams.id).maybeSingle() : Promise.resolve({ data: null }),
    searchParams.id ? dataClient.from("school_websites").select("design_template").eq("school_id", searchParams.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (searchParams.id && !school) notFound();
  const selectedOrganization = searchParams.organization ? (organizations ?? []).find((organization) => organization.id === searchParams.organization) : null;
  const editing = Boolean(school);
  const initial = school ? { ...school, design_template: website?.design_template === "design-2" ? "design-2" : "design-1" } : selectedOrganization ? { organization_id: selectedOrganization.id, name: "", code: "", slug: "", is_active: true } : undefined;
  const organizationId = school?.organization_id ?? selectedOrganization?.id;
  return <div className="-mx-2 -mt-2 min-w-0 space-y-3 sm:-mx-3 sm:-mt-3 lg:-mx-4 lg:-mt-4"><div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white px-3 py-2.5 shadow-sm sm:px-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg text-ink-700">⌂</div><div className="min-w-0"><h1 className="truncate font-display text-xl font-semibold text-ink-700 sm:text-2xl">{editing ? "Edit School / Branch" : "Add School / Branch"}</h1><p className="mt-1 truncate text-sm text-slate/60">{editing ? "Update the school details below." : "Create a school under the selected organization."}</p></div></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-ink-700">{editing ? "Edit school" : "New school"}</span>{(school?.id || organizationId) && <Link href={school?.id ? `/school-master/${school.id}` : `/organization-master/${organizationId}`} className="inline-flex min-h-9 items-center rounded-lg border border-ink-700 bg-ink-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-600">← Back</Link>}</div></div><SchoolForm organizations={organizations ?? []} fixedOrganizationId={editing ? undefined : organizationId} id={school?.id} initial={initial as any} /></div>;
}
