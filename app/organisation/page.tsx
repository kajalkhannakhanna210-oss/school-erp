import { requireOrganisationUser } from "@/lib/security/authorization";
export const dynamic = "force-dynamic";
export default async function OrganisationPage() { const context = await requireOrganisationUser(); return <main><h1 className="text-2xl font-bold">Organisation Dashboard</h1><p className="mt-2 text-slate-600">Organisation: {context.organisationId}</p></main>; }
