import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/facilities", label: "Facilities" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/gallery", label: "Gallery" },
  { href: "/events", label: "Events" },
  { href: "/notices", label: "Notices" },
  { href: "/contact", label: "Contact" },
];

const FOOTER_LINKS = [
  { href: "/about", label: "About the school" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact us" },
];

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settingsRows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["school_name", "contact_email", "contact_phone", "contact_address", "facebook_url", "twitter_url", "instagram_url"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
  const schoolName = settings.school_name || "Your School Name";
  const contactAddress = settings.contact_address || "123 Education Lane, Knowledge Park\nNew Delhi, India 110001";
  const contactEmail = settings.contact_email || "admissions@yourschool.edu.in";
  const contactPhone = settings.contact_phone || "+91 11 2345 6789";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-xl text-ink-700">
            {schoolName}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate lg:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink-700">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-md bg-ink-700 px-4 py-2 text-sm font-medium text-paper hover:bg-ink-600"
          >
            {user ? "Dashboard" : "Login"}
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-100 bg-ink-900 text-paper">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="font-display text-2xl text-paper">{schoolName}</div>
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
