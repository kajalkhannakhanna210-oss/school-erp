import { requireSuperAdmin } from "@/lib/security/authorization";
export const dynamic = "force-dynamic";
export default async function SuperAdminPage() { await requireSuperAdmin(); return <main><h1 className="text-2xl font-bold">Platform Dashboard</h1><p className="mt-2 text-slate-600">Manage organisations, schools, subscriptions, settings, reports, and platform users.</p></main>; }
