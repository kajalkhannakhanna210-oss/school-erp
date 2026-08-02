import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";

export default async function ContactPage() {
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
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <iframe title="School location map" src={`https://www.google.com/maps?q=${encodeURIComponent(contactAddress)}&output=embed`} className="h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
