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

  const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    if (href === currentUrl) return;
    setLoading(true);
    router.push(href);
  }

  async function handlePrefetch() {
    try {
      await router.prefetch(href);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (loading) setLoading(false);
  }, [pathname, searchParams?.toString()]);

  // Map color classes to text color and light background
  const colorMap: Record<string, { text: string; bg: string; icon: string; border: string }> = {
    "bg-ink-700": { text: "text-ink-700", bg: "bg-ink-100", icon: "text-ink-700", border: "border-ink-300" },
    "bg-emerald-500": { text: "text-emerald-600", bg: "bg-emerald-100", icon: "text-emerald-500", border: "border-emerald-300" },
    "bg-amber-500": { text: "text-amber-600", bg: "bg-amber-100", icon: "text-amber-500", border: "border-amber-300" },
    "bg-rose-500": { text: "text-rose-600", bg: "bg-rose-100", icon: "text-rose-500", border: "border-rose-300" },
    "bg-slate-500": { text: "text-slate-600", bg: "bg-slate-100", icon: "text-slate-500", border: "border-slate-300" },
  };

  const colors = colorMap[colorClass] || colorMap["bg-ink-700"];

  return (
    <a 
      href={href} 
      onClick={handleClick} 
      onMouseEnter={handlePrefetch} 
      className={`relative min-h-[90px] sm:min-h-[120px] md:min-h-[140px] flex flex-col justify-start gap-2 overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 hover:shadow-md p-3 sm:p-4 group ${
        active 
          ? `${colorClass} border-l-8 shadow-lg` 
          : `border-gray-200 border-l-4 ${colors.border}`
      }`}
    >
      {/* Content */}
      <div className="min-w-0 pr-8">
        {/* Title */}
        <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest ${colors.text} mb-2 opacity-80 truncate whitespace-nowrap overflow-hidden`}>
          {title}
        </p>

        {/* Large number */}
        <p className="text-2xl sm:text-3xl md:text-4xl font-black text-ink-900 leading-tight">
          {count}
        </p>

        {/* Subtitle */}
        {subtitle && (
                  <p className={`mt-1 text-[12px] sm:text-sm ${colors.text} leading-tight opacity-70 truncate whitespace-nowrap overflow-hidden`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Icon badge on the right */}
      <div className={`absolute top-4 right-4 sm:top-4 sm:right-4 h-9 w-9 sm:h-11 sm:w-11 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
              <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" opacity="0.2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
          <svg className="h-8 w-8 animate-spin text-ink-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      )}
    </a>
  );
}
