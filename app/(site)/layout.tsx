import Link from "next/link";
import type { ReactNode } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { withPublicDataTimeout } from "@/lib/supabase/public";
import { MobileNavigation } from "./mobile-navigation";
import { ScrollToTop } from "./scroll-to-top";
import { getSiteConfig } from "@/lib/website/config";
import { Design2SiteChrome } from "@/components/website/templates/design-2/site-chrome";

const NAV_LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/events", label: "Events" },
  { href: "/notices", label: "Notices" },
  { href: "/contact", label: "Contact Us" },
];

const ORGANISATION_LINKS = [
  { href: "/about", label: "About the school" },
  { href: "/principal-message", label: "Principal’s message" },
  { href: "/chairman-message", label: "Chairman’s message" },
];

const INFORMATION_LINKS = [
  { href: "/academics", label: "Academics" },
  { href: "/facilities", label: "Facilities" },
  { href: "/admissions", label: "Admissions" },
  { href: "/fee-structure", label: "Fee structure" },
  { href: "/alumni", label: "Alumni registration" },
  { href: "/contact", label: "Contact us" },
];

const FOOTER_LINKS = [
  { href: "/about", label: "About the school" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact us" },
];

export const revalidate = 300;

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const supabase = createPublicClient();
  const siteConfig = await getSiteConfig();

  let settingsRows: { key: string; value: string }[] = [];
  try {
    const settingsRequest = supabase.from("site_settings").select("key, value").in("key", ["school_name", "contact_email", "contact_phone", "contact_address", "facebook_url", "twitter_url", "instagram_url"]);
    const result = await withPublicDataTimeout(
      settingsRequest,
      { data: [] as { key: string; value: string }[] } as Awaited<typeof settingsRequest>
    );
    settingsRows = (result.data ?? []) as { key: string; value: string }[];
  } catch {
    // Keep public pages available with fallback school details during outages.
  }
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
  const schoolName = siteConfig?.website.website_title || settings.school_name || "Your School Name";
  const contactAddress = settings.contact_address || "123 Education Lane, Knowledge Park\nNew Delhi, India 110001";
  const contactEmail = settings.contact_email || "admissions@yourschool.edu.in";
  const contactPhone = settings.contact_phone || "+91 11 2345 6789";
  const schoolInitials = schoolName
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word.charAt(0))
    .join("")
    .toUpperCase();

  if (siteConfig?.template.id === "design-2") {
    return (
      <Design2SiteChrome
        schoolName={schoolName}
        website={siteConfig.website}
        email={contactEmail}
        phone={contactPhone}
        address={contactAddress}
      >
        {children}
      </Design2SiteChrome>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper" data-school-id={siteConfig?.school.id} data-website-template={siteConfig?.template.id ?? "design-1"}>
      <header className="fixed inset-x-0 top-0 z-40 bg-white shadow-[0_1px_0_rgba(30,42,74,0.08)]">
        <div className="hidden border-b border-white/10 bg-ink-900 text-paper md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-[11px] font-medium uppercase tracking-[0.13em] text-paper/70">
            <span>Learning with purpose · Growing with confidence</span>
            <div className="flex items-center gap-5 normal-case tracking-normal">
              <a href={`mailto:${contactEmail}`} className="transition hover:text-gold">{contactEmail}</a>
              <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="transition hover:text-gold">{contactPhone}</a>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:py-5">
          <Link href="/" className="flex items-center gap-3" aria-label={`${schoolName} home`}>
            <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-gold bg-ink-900 font-display text-base tracking-wide text-gold shadow-sm">{schoolInitials}</span>
            <span>
              <span className="block max-w-[11rem] truncate font-display text-base leading-none text-ink-700 sm:max-w-none sm:text-xl">{schoolName}</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-gold-600">Inspire · Learn · Lead</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate lg:flex">
            <NavMenu label="Organisation" links={ORGANISATION_LINKS} />
            <NavMenu label="Information" links={INFORMATION_LINKS} />
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="relative py-2 transition hover:text-gold-600 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform hover:after:scale-x-100">
                {l.label}
              </Link>
            ))}
          </nav>
          <MobileNavigation organisationLinks={ORGANISATION_LINKS} informationLinks={INFORMATION_LINKS} navLinks={NAV_LINKS} />
          <Link
            href="/login"
            className="hidden rounded-md bg-ink-700 px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-ink-600 hover:shadow-md sm:inline-flex"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-[5.5rem] md:pt-[7.5rem] lg:pt-[5.5rem]">{children}</main>

      <ScrollToTop />

      <footer className="border-t border-ink-100 bg-ink-900 text-paper">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/70 font-display text-sm text-gold">{schoolInitials}</span>
                <div className="font-display text-2xl text-paper">{schoolName}</div>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-6 text-paper/65">A thoughtful education for curious minds, kind hearts, and confident futures.</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">Visit &amp; contact</p>
              <address className="mt-4 whitespace-pre-line text-sm not-italic leading-6 text-paper/70">{contactAddress}</address>
              <a href={`mailto:${contactEmail}`} className="mt-4 block text-sm text-paper/70 hover:text-gold">{contactEmail}</a>
              <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="mt-1 block text-sm text-paper/70 hover:text-gold">{contactPhone}</a>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">Explore</p>
              <nav className="mt-4 flex flex-col gap-2 text-sm text-paper/70">
                {FOOTER_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="w-fit hover:text-gold">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">Stay connected</p>
              <p className="mt-4 max-w-xs text-sm leading-6 text-paper/65">Follow our school community and keep up with news, events, and student achievements.</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                {settings.facebook_url && (
                  <a href={settings.facebook_url} className="w-fit text-paper/70 hover:text-gold" target="_blank" rel="noreferrer">
                    Facebook
                  </a>
                )}
                {settings.twitter_url && (
                  <a href={settings.twitter_url} className="w-fit text-paper/70 hover:text-gold" target="_blank" rel="noreferrer">
                    Twitter
                  </a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} className="w-fit text-paper/70 hover:text-gold" target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                )}
                {!settings.facebook_url && !settings.twitter_url && !settings.instagram_url && (
                  <Link href="/contact" className="w-fit text-paper/70 hover:text-gold">Get in touch →</Link>
                )}
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/15 pt-6 text-xs text-paper/45">
            © {new Date().getFullYear()} {schoolName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavMenu({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <div className="group relative py-2">
      <button type="button" className="inline-flex items-center gap-1 transition hover:text-gold-600" aria-haspopup="true">
        {label}<span aria-hidden="true" className="text-[10px]">▾</span>
      </button>
      <div className="invisible absolute left-0 top-full z-30 mt-1 w-52 translate-y-1 rounded-lg border border-ink-100 bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {links.map((link) => <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2.5 text-sm text-slate transition hover:bg-ink-50 hover:text-ink-700">{link.label}</Link>)}
      </div>
    </div>
  );
}
