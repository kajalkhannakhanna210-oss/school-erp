"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "./nav-config";

export function DashboardMobileNavigation({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button type="button" aria-label="Open dashboard menu" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 px-3 text-sm font-semibold text-white transition hover:bg-white/10">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-none stroke-current stroke-[2.5]"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg><span className="hidden sm:inline">Menu</span>
      </button>
      {open && <div className="fixed inset-0" style={{ zIndex: 9999 }}>
        <button type="button" aria-label="Close dashboard menu" onClick={() => setOpen(false)} className="mobile-menu-backdrop absolute inset-0 bg-ink-900/60" />
        <nav aria-label="Dashboard navigation" className="mobile-menu-drawer absolute left-0 top-0 flex h-full w-[min(19rem,calc(100vw-1.25rem))] flex-col bg-ink-900 text-white shadow-2xl" style={{ zIndex: 10000 }}>
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-sm font-bold text-ink-900">R</span><div><p className="font-display text-lg font-bold">Registrar</p><p className="text-xs text-white/60">School Management</p></div></div>
            <button type="button" aria-label="Close dashboard menu" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 text-white hover:bg-white/10"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80">Navigation</p>
            <div className="space-y-1">
              {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${pathname === item.href ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}><span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center text-lg leading-none">{item.icon ?? "•"}</span><span>{item.label}</span></Link>)}
            </div>
          </div>
        </nav>
      </div>}
    </div>
  );
}
