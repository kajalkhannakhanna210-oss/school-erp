"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function StudentDirectoryMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100 sm:hidden"
      >
        Student directory
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <div className="hidden items-center gap-1 sm:flex">{children}</div>
      {open && (
        <>
          <button type="button" aria-label="Close student directory menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-ink-100 bg-white p-1.5 shadow-xl sm:hidden">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function StudentDirectoryMenuItem({ children }: { children: ReactNode }) {
  return <div role="menuitem" className="block rounded-md px-2 py-1 text-sm text-ink-700 hover:bg-ink-50 sm:inline-flex sm:h-10 sm:min-h-10 sm:min-w-[150px] sm:items-center sm:justify-center sm:whitespace-nowrap sm:rounded-lg sm:bg-ink-700 sm:px-4 sm:py-2 sm:font-semibold sm:text-white sm:shadow-sm sm:hover:bg-ink-600 sm:[&_a]:text-white sm:[&_button]:text-white">{children}</div>;
}
