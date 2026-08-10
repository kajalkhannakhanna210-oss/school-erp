"use client";

import { useState } from "react";
import { SignOutButton } from "./sign-out-button";

export function UserMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-700 hover:bg-ink-200 transition"
        title="User menu"
      >
        {userName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            style={{ zIndex: 40 }}
          />
          <div
            className="absolute right-0 top-12 w-48 rounded-lg bg-white shadow-lg border border-ink-100 z-50"
            style={{ zIndex: 50 }}
          >
            <div className="px-4 py-3 border-b border-ink-100">
              <p className="text-xs text-slate/60">Signed in as</p>
              <p className="text-sm font-semibold text-ink-700 truncate">{userName}</p>
            </div>
            <div className="px-4 py-3 flex justify-center">
              <div onClick={() => setOpen(false)}>
                <SignOutButton />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
