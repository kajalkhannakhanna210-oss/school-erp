"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterField = "q" | "status" | null;
const OrganizationFilterContext = createContext<FilterField>(null);

export function OrganizationFilterProcessing({ field }: { field: Exclude<FilterField, null> }) {
  const processingField = useContext(OrganizationFilterContext);
  return processingField === field ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-label="Processing filter"><span className="block h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-ink-700" /></span> : null;
}

export function OrganizationFilters({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [processing, startTransition] = useTransition();
  const [processingField, setProcessingField] = useState<FilterField>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (name: "q" | "status", value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setProcessingField(name);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }));
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLInputElement;
    if (target.name === "q") {
      const value = target.value;
      timerRef.current = setTimeout(() => updateFilter("q", value), 300);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target as unknown as HTMLSelectElement;
    if (target.name === "status") updateFilter("status", target.value);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!processing) setProcessingField(null);
  }, [processing]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 shadow-sm md:hidden"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V18l-3 1v-6.5L4 5Z" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{open ? "Hide filters" : "Filters"}</span><span aria-hidden="true" className="ml-auto">⌄</span>
      </button>
      <OrganizationFilterContext.Provider value={processing ? processingField : null}>
        <div className={`${open ? "block" : "hidden"} w-full md:block md:w-auto`} onKeyUp={handleKeyUp} onChange={handleChange} onSubmit={(event) => event.preventDefault()}>
          {children}
        </div>
      </OrganizationFilterContext.Provider>
    </>
  );
}
