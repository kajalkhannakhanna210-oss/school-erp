import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { OrganizationForm } from "../../organization-form";
export default async function EditOrganizationPage({ params }: { params: { id: string } }) { try { await requirePageAccess("organization_master"); } catch { redirect("/dashboard"); } const supabase = await createClient(); const { data: org } = await supabase.from("organizations").select("name,code,is_active").eq("id", params.id).maybeSingle(); if (!org) notFound(); return <div><Link href={`/organization-master/${params.id}`} className="text-sm font-semibold text-ink-700">← Organization details</Link><h1 className="mt-4 font-display text-2xl text-ink-700">Edit Organization</h1><div className="mt-6"><OrganizationForm id={params.id} initial={org} /></div></div>; }
