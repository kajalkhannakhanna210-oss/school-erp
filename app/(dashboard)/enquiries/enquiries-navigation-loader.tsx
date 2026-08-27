"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function EnquiriesNavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link || event.defaultPrevented || event.button !== 0) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/enquiries")) return;
      if (link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const nextUrl = new URL(href, window.location.origin);
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;
      setLoading(true);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center animate-[enquiry-loader-fade-in_180ms_ease-out] bg-white/55 backdrop-blur-[1px]" role="status" aria-label="Loading enquiry data">
      <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm font-semibold text-ink-700 shadow-lg animate-[enquiry-loader-card-in_220ms_ease-out]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" aria-hidden="true" />
        Loading enquiries…
      </div>
    </div>
  );
}
