import Link from "next/link";
import type { ReactNode } from "react";
import type { SchoolWebsite } from "@/lib/website/types";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/academics", label: "Academics" },
  { href: "/facilities", label: "Beyond academics" },
  { href: "/facilities", label: "Infrastructure" },
  { href: "/admissions", label: "Admissions" },
  { href: "/events", label: "News & events" },
  { href: "/contact", label: "Contact" },
];

type Props = {
  children: ReactNode;
  schoolName: string;
  website: SchoolWebsite;
  email: string;
  phone: string;
  address: string;
  href: (path: string) => string;
};

export function Design2SiteChrome({ children, schoolName, website, email, phone, address, href }: Props) {
  const primary = website.primary_color || "#123b42";
  const accent = website.accent_color || "#e7b75f";
  const initials = schoolName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8f6] text-[#173338]" style={{ "--design2-primary": primary, "--design2-accent": accent } as React.CSSProperties}>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="hidden bg-[#17284f] text-[11px] font-medium uppercase tracking-[0.16em] text-white/75 lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-2"><span>Service before self · Excellence in education</span><span>{email} · {phone}</span></div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href={href("/")} className="flex items-center gap-3" aria-label={`${schoolName} home`}>
            {website.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={website.logo_url} alt="" className="h-11 w-11 rounded-xl object-contain" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--design2-primary)] text-sm font-bold text-white">{initials}</span>
            )}
            <span className="max-w-[13rem] truncate text-lg font-bold uppercase tracking-tight text-[#17284f] sm:max-w-none sm:text-xl">{schoolName}</span>
          </Link>
          <nav className="hidden items-center gap-4 text-[13px] font-semibold xl:flex">
            {LINKS.map((link) => <Link key={`${link.href}-${link.label}`} href={href(link.href)} className="transition hover:text-[var(--design2-primary)]">{link.label}</Link>)}
          </nav>
          <Link href={href("/contact")} className="rounded-md bg-[var(--design2-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">Contact us</Link>
        </div>
        <div className="hidden border-t border-[#17284f]/10 bg-[#f5f7fb] lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-2 text-xs font-semibold text-[#17284f]/70">
            <span>Service before self</span>
            <div className="flex gap-5"><Link href={href("/events")} className="hover:text-[#bd8b08]">Circulars</Link><Link href={href("/admissions")} className="hover:text-[#bd8b08]">Register now</Link><Link href={href("/contact")} className="hover:text-[#bd8b08]">Reach us</Link></div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[var(--design2-primary)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-bold tracking-tight">{schoolName}</p>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/70">A welcoming place to learn deeply, live kindly, and grow into the future with confidence.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--design2-accent)]">Explore</p>
            <div className="mt-4 grid gap-2 text-sm text-white/75">{LINKS.slice(1, 5).map((link) => <Link key={`${link.href}-${link.label}`} href={href(link.href)} className="w-fit hover:text-white">{link.label}</Link>)}</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--design2-accent)]">Find us</p>
            <address className="mt-4 whitespace-pre-line text-sm not-italic leading-7 text-white/75">{address}</address>
            <a href={`mailto:${email}`} className="mt-3 block text-sm text-white/75 hover:text-white">{email}</a>
          </div>
        </div>
        <div className="border-t border-white/15 px-5 py-5 text-center text-xs text-white/50">© {new Date().getFullYear()} {schoolName}. All rights reserved.</div>
      </footer>
    </div>
  );
}
