"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

export function StaffFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

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
    <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-64">
        <Input
          placeholder="Search department, designation, employee ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Button type="submit" variant="ghost">
        Apply
      </Button>
      <Button type="button" variant="ghost" onClick={clearFilters}>
        Clear
      </Button>
    </form>
  );
}
