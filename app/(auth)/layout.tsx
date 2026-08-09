import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-cover bg-center p-12 text-paper lg:flex" style={{ backgroundImage: "linear-gradient(rgba(34,47,87,.82), rgba(34,47,87,.9)), url('/about-school.jpg')" }}>
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
