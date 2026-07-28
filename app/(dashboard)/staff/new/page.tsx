import { StaffForm } from "../staff-form";

export default function NewStaffPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Add Staff</h1>
      <p className="mt-1 text-sm text-slate/60">
        Creates the staff member&apos;s login and sends them an email to set their password.
      </p>
      <div className="mt-6">
        <StaffForm mode="create" />
      </div>
    </div>
  );
}
