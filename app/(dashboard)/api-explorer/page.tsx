import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { ApiExplorerClient } from "./api-explorer-client";

export const dynamic = "force-dynamic";

export default async function ApiExplorerPage() {
  try { await requireSuperAdmin(); } catch { redirect("/dashboard"); }

  return <div className="-mx-2 max-w-7xl sm:-mx-3 lg:-mx-4">
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-ink-100 border-l-4 border-l-gold-500 bg-white px-2 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-3">
      <div className="min-w-0">
        <h1 className="font-display text-lg font-semibold text-ink-700 sm:text-xl">API Explorer</h1>
      </div>
    </div>

    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#f0d978] bg-[#fff9df] px-3 py-3 text-[#765b00] shadow-sm"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f7c200] text-sm font-bold text-[#17213f]">i</div><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.1em]">Spotlight: Student Birthdays</p><p className="mt-1 text-xs leading-5 text-[#8a6d12]">New endpoint <code className="rounded bg-[#ffefad] px-1 font-mono text-[11px]">/api/students/birthdays</code> supports <code className="font-mono">days</code>, <code className="font-mono">class</code>, <code className="font-mono">section</code>, and <code className="font-mono">session</code> filters.</p></div></div>

    <ApiExplorerClient />
  </div>;
}
