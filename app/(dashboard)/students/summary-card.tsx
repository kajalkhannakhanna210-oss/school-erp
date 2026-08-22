"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

export function SummaryCard({ href, title, count, subtitle, colorClass = "bg-ink-700", active = false, icon }: {
  href: string;
  title: string;
  count: number | string;
  subtitle?: string;
  colorClass?: string;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

  // Use Link for navigation to ensure full App Router data fetches.
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

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleClick = () => {
    if (active || currentUrl === href) {
      return;
    }
    setLoading(true);
  };

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
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={handlePrefetch}
      onClick={handleClick}
      className={`relative flex flex-col justify-between gap-2 overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 hover:shadow-md p-3 sm:p-4 lg:p-3 group min-h-[90px] sm:min-h-[110px] lg:min-h-[120px] ${
        active 
          ? `${colorClass} border-l-8 shadow-lg` 
          : `border-gray-200 border-l-4 ${colors.border}`
      }`}>
      {/* Content */}
      <div className="min-w-0 flex-1 pr-10">
        {/* Title */}
        <p className={`text-[10px] sm:text-xs lg:text-[11px] font-bold uppercase tracking-wider ${colors.text} mb-1 opacity-80`}>
          {title}
        </p>

        {/* Large number */}
        <p className="text-2xl sm:text-3xl lg:text-3xl font-black text-ink-900 leading-tight">
          {count}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className={`mt-1 text-[10px] sm:text-xs lg:text-[10px] ${colors.text} leading-tight opacity-75`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Icon badge on the right */}
      <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-3 lg:right-3 h-8 w-8 sm:h-9 sm:w-9 lg:h-8 lg:w-8 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
        {icon ? (
          <div className="h-5 w-5 sm:h-6 sm:w-6 lg:h-5 lg:w-5">{icon}</div>
        ) : (
          <svg className={`h-3 w-3 sm:h-4 sm:w-4 lg:h-3 lg:w-3 ${colors.icon}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" opacity="0.18" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
          <svg className="h-8 w-8 animate-spin text-ink-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      )}
    </Link>
  );
}
