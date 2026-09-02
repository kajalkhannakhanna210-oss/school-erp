import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";
import type { Metadata } from "next";
import { getPageMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/website/config";
import { Design2ContentPage } from "@/components/website/templates/design-2/content-page";
const contactMetadata: Metadata = { title: "Contact Us", description: "Contact the school office for admissions, academic information, fees, facilities, and general enquiries.", alternates: { canonical: "/contact" } };
export async function generateMetadata() { return getPageMetadata("/contact", contactMetadata); }

export default async function ContactPage() {
  const siteConfig = await getSiteConfig();
  if (siteConfig?.template.id === "design-2") return <Design2ContentPage title="Contact us" content="Our school office and admissions team are here to help with your questions. Please use the contact details in the footer to reach us." imageUrl="/about-school.jpg" />;
  const supabase = await createClient();
  let settingsRows: { key: string; value: string }[] = [];
  try {
    const result = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["contact_email", "contact_phone", "contact_address"]);
    settingsRows = (result.data ?? []) as { key: string; value: string }[];
  } catch {
    // The public contact page remains usable when Supabase is temporarily unavailable.
  }
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
  const contactAddress = settings.contact_address || "123 Education Lane, Knowledge Park\nNew Delhi, India 110001";
  const contactPhone = settings.contact_phone || "+91 11 2345 6789";
  const contactEmail = settings.contact_email || "admissions@yourschool.edu.in";

  return (
    <div className="bg-[#f4f6fb]">
      <div className="bg-ink-900 px-6 py-16 text-white sm:py-20"><div className="mx-auto max-w-6xl"><p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Contact our school</p><h1 className="mt-4 font-display text-5xl font-bold">Let&apos;s start a conversation.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">Our admissions and school office teams are here to help with your questions.</p></div></div>
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <ContactForm />
        </div>
        <div className="space-y-6 text-sm text-slate/70">
          <h2 className="font-display text-2xl font-bold text-ink-700">Get in touch</h2>
          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm"><dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">Address</dt><dd className="mt-2 whitespace-pre-line leading-6 text-slate/75">{contactAddress}</dd></div>
              <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm"><dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">Phone</dt><dd className="mt-2"><a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="font-semibold text-ink-700 hover:text-gold-600">{contactPhone}</a></dd></div>
              <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm"><dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">Email</dt><dd className="mt-2 break-all"><a href={`mailto:${contactEmail}`} className="font-semibold text-ink-700 hover:text-gold-600">{contactEmail}</a></dd></div>
          </dl>
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">Directions</p>
            <p className="mt-3 text-sm leading-7 text-slate/75">
              The school location is listed above. Use the address to navigate with your preferred maps app.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`}
              className="mt-4 inline-flex rounded-lg bg-ink-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-600"
              target="_blank"
              rel="noreferrer"
            >
              Open map in browser
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
