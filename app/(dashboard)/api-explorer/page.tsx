import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-role";
import { ApiExplorerClient } from "./api-explorer-client";

export const dynamic = "force-dynamic";

export default async function ApiExplorerPage() {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink-700 flex items-center gap-2">
            🔌 API Explorer
          </h1>
          <p className="mt-1 text-sm text-slate/60 max-w-2xl">
            Browse and explore all REST API endpoints available in this School ERP.
            Click any endpoint to see its parameters, authentication requirements, and response examples.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            GET
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 font-semibold">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
            POST
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 font-semibold">
            🔒 Auth required
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 font-semibold">
            ✨ New
          </span>
        </div>
      </div>

      {/* Notice about Birthday API */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
        <span className="text-xl">🎂</span>
        <div>
          <p className="font-semibold">New API Added: Student Birthdays</p>
          <p className="text-xs mt-0.5 text-amber-700">
            <code className="font-mono bg-amber-100 rounded px-1">/api/students/birthdays</code>
            {" "}— Returns students whose birthday is today or within the next N days.
            Supports filters: <code className="font-mono bg-amber-100 rounded px-1">days</code>,{" "}
            <code className="font-mono bg-amber-100 rounded px-1">class</code>,{" "}
            <code className="font-mono bg-amber-100 rounded px-1">section</code>,{" "}
            <code className="font-mono bg-amber-100 rounded px-1">session</code>.
          </p>
        </div>
      </div>

      {/* Client-side explorer */}
      <ApiExplorerClient />
    </div>
  );
}
