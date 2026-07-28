import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink-700 p-12 text-paper lg:flex">
        <div className="font-display text-2xl tracking-tight">Registrar</div>
        <div>
          <p className="max-w-md font-display text-4xl leading-tight">
            The record of every student, kept in one ledger.
          </p>
          <p className="mt-4 max-w-sm text-ink-100">
            Admissions, attendance, fees, and results — one system of record for the whole
            school.
          </p>
        </div>
        <div className="text-sm text-ink-100">School Management System</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
