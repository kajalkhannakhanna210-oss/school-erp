import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { OrganizationEditModal } from "../../organization-edit-modal";

export default async function EditOrganizationPage({ params }: { params: { id: string } }) {
  try { await requirePageAccess("organization_master"); } catch { redirect("/dashboard"); }
  const supabase = await createClient();
  const { data: organization } = await supabase.from("organizations").select("id,name,code,is_active").eq("id", params.id).maybeSingle();
  if (!organization) notFound();
  return <div><Link href={`/organization-master/${params.id}`} className="text-sm font-semibold text-ink-700">← Organization details</Link><OrganizationEditModal organization={organization} initialOpen /></div>;
}
