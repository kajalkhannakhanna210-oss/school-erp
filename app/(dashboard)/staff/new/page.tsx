import { StaffForm } from "../staff-form";

export default function NewStaffPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Add Staff</h1>
      <p className="mt-1 text-sm text-slate/60">
        Creates the staff member&apos;s login using the temporary password you provide.
      </p>
      {searchParams.error && <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{searchParams.error}</div>}
      <div className="mt-6">
        <StaffForm mode="create" />
      </div>
    </div>
  );
}
