"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

export function StaffFilters({ showSearch = true, showFilterButton = true }: { showSearch?: boolean; showFilterButton?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      startTransition(() => router.replace(`/staff?${params.toString()}`, { scroll: false }));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [q, router]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`/staff?${params.toString()}`);
  }

  function clearFilters() {
    setQ("");
    router.push("/staff");
  }

  return (
    <form onSubmit={applyFilters} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      {showFilterButton && <Button type="button" variant="ghost" className="sm:hidden" onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "Filters"}</Button>}
      {showSearch && <div className="w-full sm:w-64">
        <Input
          placeholder="Search department, designation, employee ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>}
      {showSearch && <Button type="submit" variant="ghost" className={`${filtersOpen ? "inline-flex" : "hidden"} sm:inline-flex`}>
        Apply
      </Button>}
      {showSearch && <Button type="button" variant="ghost" className={`${filtersOpen ? "inline-flex" : "hidden"} sm:inline-flex`} onClick={clearFilters}>
        Clear
      </Button>}
    </form>
  );
}
