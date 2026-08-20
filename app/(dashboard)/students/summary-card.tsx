"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SummaryCard({ href, title, count, subtitle, colorClass = "bg-ink-700", active = false }: {
  href: string;
  title: string;
  count: number | string;
  subtitle?: string;
  colorClass?: string;
  active?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Build current full URL (path + query) to detect navigation completion
  const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    // If already on the target url, do nothing
    if (href === currentUrl) return;

    setLoading(true);
    // Navigate — when pathname/searchParams change below, loading will be cleared
    router.push(href);
  }

  // Prefetch target route on hover to reduce perceived load time
  async function handlePrefetch() {
    try {
      await router.prefetch(href);
    } catch {
      // ignore prefetch errors silently
    }
  }

  // When the route updates (pathname or search params change), clear the loader
  useEffect(() => {
    if (loading) setLoading(false);
  }, [pathname, searchParams?.toString()]);

  return (
    <a href={href} onClick={handleClick} onMouseEnter={() => handlePrefetch()} className={`relative min-h-[120px] flex flex-col justify-between overflow-hidden rounded-lg border border-ink-100 bg-white px-3 py-3 shadow-sm sm:rounded-xl sm:px-4 sm:py-4 ${active ? "ring-2 ring-gold-300" : ""}`}>
      {/* small dot and title */}
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs leading-tight text-slate/70 sm:gap-2 sm:text-sm">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colorClass} sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5`} aria-hidden="true" />
          <span className="truncate">{title}</span>
        </p>

        <p className="mt-1.5 text-base font-bold text-ink-700 sm:mt-2 sm:text-lg lg:text-2xl truncate">{count}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate/500 line-clamp-2 sm:line-clamp-1">{subtitle}</p>}
      </div>

      {/* make sure footer spacing keeps consistent */}
      <div className="mt-1.5 text-xs text-slate/400" aria-hidden="true">&nbsp;</div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
          <svg className="h-6 w-6 animate-spin text-ink-700 sm:h-8 sm:w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      )}
    </a>
  );
}
