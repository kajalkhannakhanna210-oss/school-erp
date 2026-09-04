"use client";

import { useState } from "react";

export function SchoolLogoPreview({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
        aria-label="Open school logo preview"
      >
        <img src={src} alt={alt} className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-2" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="School logo preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative h-[min(380px,80vh)] w-[min(380px,90vw)] rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-lg text-white shadow-lg"
              aria-label="Close school logo preview"
            >
              ×
            </button>
            <img src={src} alt={alt} className="h-full w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
