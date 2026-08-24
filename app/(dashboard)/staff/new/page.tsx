import { StaffForm } from "../staff-form";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function NewStaffPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-w-0 space-y-4">
      {/* Header Banner matching /staff page */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 border-l-4 border-l-gold-500 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">Staff Management</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-700 sm:text-2xl">Add New Staff Member</h1>
          <p className="mt-0.5 text-xs text-slate/70">
            Create a new employee profile and credentials using the temporary password provided.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/staff">
            <Button variant="outline" className="h-10 px-4 text-sm font-semibold shadow-sm">
              ← Back to Staff Directory
            </Button>
          </Link>
        </div>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {searchParams.error}
        </div>
      )}

      <div className="mt-4">
        <StaffForm mode="create" />
      </div>
    </div>
  );
}
