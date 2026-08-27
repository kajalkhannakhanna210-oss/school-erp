"use client";

import { Children, cloneElement, isValidElement, ReactNode, useEffect, useState } from "react";
import { EnquiryFilters } from "./enquiry-filters";
import { usePathname, useRouter } from "next/navigation";

type FilterProps = Parameters<typeof EnquiryFilters>[0];

export function EnquiriesDirectoryControls({ tabs, activeTab, ...filterProps }: FilterProps & { tabs: ReactNode; activeTab?: string }) {
  const [showFilters, setShowFilters] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(activeTab ?? "all");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/enquiries") setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref || !activeTab) return;
    const selectedUrl = new URL(pendingHref, "http://enquiries.local");
    const selectedTab = selectedUrl.searchParams.get("followup_due")
      ?? (selectedUrl.searchParams.get("status") === "Won" ? "won" : "all");
    if (selectedTab === activeTab) setPendingHref(null);
  }, [activeTab, pendingHref]);

  useEffect(() => {
    if (activeTab) setSelectedFilter(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleTabLoaded = () => setPendingHref(null);
    window.addEventListener("enquiry-tab-loaded", handleTabLoaded);
    return () => window.removeEventListener("enquiry-tab-loaded", handleTabLoaded);
  }, []);

  const enhanceTabs = (node: ReactNode): ReactNode => Children.map(node, (child) => {
    if (!isValidElement<{ href?: string; className?: string; children?: ReactNode; onClick?: (event: React.MouseEvent) => void }>(child)) return child;
    const href = child.props.href;
    const children = child.props.children ? enhanceTabs(child.props.children) : child.props.children;
    if (!href) return cloneElement(child, {}, children);

    // This function runs while the client component is rendered on the server too.
    // Use a fixed origin so tab decoration never evaluates `window` during SSR.
    const nextUrl = new URL(href, "http://enquiries.local");
    const tabFilter = nextUrl.searchParams.get("followup_due") ?? (nextUrl.searchParams.get("status") === "Won" ? "won" : "all");
    const isPendingTab = pendingHref === href;
    const isSelectedTab = selectedFilter === tabFilter;
    const pendingTabColor = href.includes("followup_due=overdue")
      ? "!bg-rose-600 !text-white"
      : href.includes("followup_due=upcoming")
        ? "!bg-ink-900 !text-white"
        : href.includes("status=Won")
          ? "!bg-emerald-600 !text-white"
          : "!bg-ink-900 !text-white";
    const inactiveTabColor = href.includes("followup_due=overdue")
      ? "!bg-rose-50 !text-rose-700"
      : href.includes("status=Won")
        ? "!bg-emerald-50 !text-emerald-700"
        : "!bg-ink-50 !text-slate/70";
    const pendingClasses = isSelectedTab ? pendingTabColor : inactiveTabColor;

    return cloneElement(child, {
      children: <>{children}{isPendingTab && <span className="ml-1 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />}</>,
      onClick: async (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setPendingHref(href);
        const filter = nextUrl.searchParams.get("followup_due") === "today"
          ? "today"
          : nextUrl.searchParams.get("followup_due") === "overdue"
            ? "overdue"
            : nextUrl.searchParams.get("followup_due") === "upcoming"
              ? "upcoming"
              : nextUrl.searchParams.get("status") === "Won" ? "won" : "all";
        // Keep the value available immediately for the RSC request. The API
        // cookie is httpOnly and remains the authoritative persisted value.
        document.cookie = `enquiries_tab_filter=${filter}; path=/; max-age=28800; samesite=lax`;
        setSelectedFilter(filter);
        window.dispatchEvent(new CustomEvent("enquiry-tab-change", { detail: filter }));
        try {
          await fetch("/api/enquiries/view-filter", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ filter }),
          });
          // The grid already switched locally; this only persists the tab for reloads.
        } catch {
          // The grid request emits enquiry-tab-loaded and clears the spinner.
        }
      },
      className: `${child.props.className ?? ""} ${pendingClasses}`,
    });
  });

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-1 text-xs font-semibold shadow-sm">
        <div className="min-w-0 flex-1 overflow-x-auto">{enhanceTabs(tabs)}</div>
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="enquiry-filter-panel"
          onClick={() => setShowFilters((visible) => !visible)}
          className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-ink-900 px-3 text-xs font-semibold text-white transition hover:bg-ink-700"
        >
          <span aria-hidden="true">☷</span>
          {showFilters ? "Hide Filters" : "Filter"}
        </button>
      </div>
      <EnquiryFilters
        {...filterProps}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
        hideToggle
      />
    </>
  );
}
