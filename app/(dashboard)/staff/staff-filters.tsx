"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";

export function StaffFilters({ showSearch = true, showFilterButton = true }: { showSearch?: boolean; showFilterButton?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const [status, setStatus] = useState(searchParams?.get("status") ?? "");
  const [statusLoading, setStatusLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams?.get("status") === status) setStatusLoading(false);
  }, [searchParams, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const cursor = searchInputRef.current?.selectionStart ?? q.length;
      startTransition(() => {
        router.replace(`/staff?${params.toString()}`, { scroll: false });
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.setSelectionRange(cursor, cursor);
        });
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q, status, router]);

  function clearFilters() {
    setQ("");
    if (status) setStatusLoading(true);
    setStatus("");
  }

  return (
    <form className="flex shrink-0 items-center gap-2 whitespace-nowrap" onSubmit={(event) => event.preventDefault()}>
      {showFilterButton && <Button type="button" variant="ghost" className="sm:hidden" onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "Filters"}</Button>}
      {showSearch && <select className="min-h-11 rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 shadow-sm" value={status} onChange={(e) => { setStatusLoading(true); setStatus(e.target.value); }} aria-label="Staff status" disabled={statusLoading}>
        <option value="">All staff</option>
        <option value="active">Active staff</option>
        <option value="inactive">Inactive staff</option>
      </select>}
      {statusLoading && <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink-700" aria-label="Loading staff" />}
      {showSearch && <div className="w-full sm:w-64">
        <Input
          ref={searchInputRef}
          placeholder="Search department, designation, employee ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>}
      {showSearch && <Button type="button" variant="ghost" className="min-h-11 bg-white" onClick={clearFilters}>Clear</Button>}
    </form>
  );
}
