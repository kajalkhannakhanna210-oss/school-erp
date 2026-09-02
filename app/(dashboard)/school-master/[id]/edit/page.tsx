import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { SchoolForm } from "../../school-form";
export default async function EditSchoolPage({ params }: { params: { id: string } }) { try { await requirePageAccess("school_master"); } catch { redirect("/dashboard"); } const supabase = await createClient(); const [{ data: school }, { data: organizations }] = await Promise.all([supabase.from("schools").select("*").eq("id", params.id).maybeSingle(), supabase.from("organizations").select("id,name,code").order("name")]); if (!school) notFound(); return <div><Link href="/school-master" className="text-sm font-semibold text-ink-700">← School / Branch Master</Link><h1 className="mt-4 font-display text-2xl text-ink-700">Edit School / Branch</h1><div className="mt-6"><SchoolForm id={params.id} organizations={organizations ?? []} initial={school} /></div></div>; }
