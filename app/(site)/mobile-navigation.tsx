"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type LinkItem = { href: string; label: string };

export function MobileNavigation({ organisationLinks, informationLinks, navLinks }: { organisationLinks: LinkItem[]; informationLinks: LinkItem[]; navLinks: LinkItem[] }) {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const pathname = usePathname();
  const groups = [
    { label: "Organisation", items: organisationLinks },
    { label: "Information", items: informationLinks },
  ];

  function closeMenu() {
    setOpen(false);
    setExpandedGroup(null);
  }

  return (
    <div className="lg:hidden">
      <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg border border-ink-100 bg-white text-ink-700 shadow-sm transition hover:border-gold hover:bg-ink-50" >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
      </button>
      {open && <div className="fixed inset-0 z-50">
        <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="mobile-menu-backdrop absolute inset-0 bg-ink-900/45" />
        <nav aria-label="Mobile navigation" className="mobile-menu-drawer absolute right-0 top-0 flex h-full w-[min(23rem,calc(100vw-1.25rem))] flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-ink-900 px-5 py-5 text-paper">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border border-gold bg-white/5 font-display text-sm font-bold text-gold">S</span><div><p className="font-display text-lg font-bold">School menu</p><p className="text-[10px] uppercase tracking-[0.18em] text-paper/60">Explore our school</p></div></div>
            <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold-600">Navigation</p>
            {groups.map((group) => <div key={group.label} className="border-b border-ink-100">
              <button type="button" aria-expanded={expandedGroup === group.label} onClick={() => setExpandedGroup((current) => current === group.label ? null : group.label)} className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-ink-700 transition hover:text-gold-600">
                {group.label}<svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 fill-none stroke-current stroke-2 transition-transform ${expandedGroup === group.label ? "rotate-180 text-gold-600" : "text-slate/50"}`}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {expandedGroup === group.label && <div className="mb-3 space-y-1 rounded-lg bg-ink-50 p-2">
                {group.items.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={`block rounded-md px-3 py-2.5 text-sm ${pathname === link.href ? "bg-white font-semibold text-ink-700" : "text-slate hover:bg-white"}`}>{link.label}</Link>)}
              </div>}
            </div>)}
            {navLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={`block border-b border-ink-100 py-4 text-sm font-semibold transition ${pathname === link.href ? "text-gold-600" : "text-ink-700 hover:text-gold-600"}`}>{link.label}</Link>)}
          </div>
          <div className="border-t border-ink-100 p-4"><Link href="/admin/login" onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-md bg-ink-700 px-4 text-sm font-semibold text-paper hover:bg-ink-600">Admin login</Link></div>
        </nav>
      </div>}
    </div>
  );
}
