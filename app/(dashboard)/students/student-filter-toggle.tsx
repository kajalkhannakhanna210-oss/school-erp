"use client";

export function StudentFilterToggle() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("toggle-student-filters"))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-50 sm:hidden">
      Filter
    </button>
  );
}
