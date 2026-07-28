import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: settingsRows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["contact_email", "contact_phone", "contact_address"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">Contact Us</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <ContactForm />
        </div>
        <div className="text-sm text-slate/70">
          <h2 className="font-display text-lg text-ink-700">Get in touch</h2>
          <dl className="mt-4 space-y-3">
            {settings.contact_address && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate/50">Address</dt>
                <dd className="mt-0.5">{settings.contact_address}</dd>
              </div>
            )}
            {settings.contact_phone && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate/50">Phone</dt>
                <dd className="mt-0.5">{settings.contact_phone}</dd>
              </div>
            )}
            {settings.contact_email && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate/50">Email</dt>
                <dd className="mt-0.5">{settings.contact_email}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
