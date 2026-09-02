import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/require-role";
export default async function NewOrganizationPage() { try { await requirePageAccess("organization_master"); } catch { redirect("/dashboard"); } redirect("/organization-master"); }
