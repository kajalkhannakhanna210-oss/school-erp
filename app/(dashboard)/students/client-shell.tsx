"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StudentTable } from "./student-table";
import { StudentFilters } from "./student-filters";
import type { StudentRow } from "./student-table";
import { Button } from "@/components/ui";

export function ClientStudentsShell({ initialRows = [] }: { initialRows?: StudentRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const search = searchParams?.toString();
        const apiUrl = `/api/students${search ? `?${search}` : ""}`;
        const res = await fetch(apiUrl, { credentials: 'same-origin' });
        const json = await res.json();
        if (!mounted) return;
        setRows(json.rows ?? []);
        setCount(json.count ?? 0);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const onPop = () => { /* re-run on history navigation */ setTimeout(load, 10); };
    window.addEventListener('popstate', onPop);
    return () => { mounted = false; window.removeEventListener('popstate', onPop); };
  }, [searchParams?.toString()]);

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" onClick={() => router.push('/students')}>Exit client mode</Button>
      </div>
      <div className="mt-2 rounded-lg border-0 bg-transparent px-0 py-0 shadow-none sm:border sm:border-ink-100 sm:bg-ink-50/50 sm:px-3 sm:py-1.5 sm:shadow-sm">
        {/* StudentFilters is a client component that updates URL on apply */}
        <StudentFilters classes={[] as any} sections={[] as any} />
      </div>
      <div className="mt-2">
        {loading && <div className="p-4 text-center text-sm text-slate/50">Loading...</div>}
        <StudentTable students={rows} canManage={false} />
      </div>
      <div className="mt-4 text-sm text-slate/60">Total: {count}</div>
    </div>
  );
}
