import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*").order("event_date", { ascending: false });
  const eventItems = events ?? [];
  const featuredEvent = eventItems[0];

  function imageUrl(path: string | null) {
    if (!path) return "/about-school.jpg";
    return path.startsWith("http") ? path : supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="bg-paper pb-20">
      <section className="relative overflow-hidden bg-ink-900 py-20 text-paper sm:py-24">
        <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full border-[48px] border-gold/15" />
        <div className="relative mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">School calendar</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">Events that bring our community together.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-paper/75">Discover the celebrations, learning experiences, competitions, and shared moments that shape school life.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6">
        {featuredEvent ? (
          <section className="relative z-10 -mt-10 overflow-hidden rounded-2xl bg-white shadow-[0_22px_50px_-30px_rgba(34,47,87,.55)] lg:grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-72 overflow-hidden bg-ink-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(featuredEvent.image_path)} alt={featuredEvent.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent to-transparent" />
              <p className="absolute bottom-6 left-6 rounded-full bg-gold px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide text-ink-900">{formatDate(featuredEvent.event_date)}</p>
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Latest event</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink-700">{featuredEvent.title}</h2>
              <p className="mt-5 whitespace-pre-line leading-7 text-slate/75">{featuredEvent.description || "More details about this school event will be shared soon."}</p>
              <Link href="/contact" className="mt-7 inline-flex w-fit rounded-lg bg-ink-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-600">Ask about this event <span className="ml-2" aria-hidden="true">→</span></Link>
            </div>
          </section>
        ) : (
          <section className="relative z-10 -mt-10 rounded-2xl bg-white p-10 text-center shadow-[0_22px_50px_-30px_rgba(34,47,87,.55)]"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Coming soon</p><h2 className="mt-4 font-display text-3xl text-ink-700">Our next school event is on its way.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate/70">Please check back soon for new dates and details.</p></section>
        )}

        {eventItems.length > 1 && (
          <section className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">More to explore</p><h2 className="mt-3 font-display text-4xl text-ink-700">On the calendar</h2></div><p className="text-sm text-slate/60">{eventItems.length - 1} more {eventItems.length === 2 ? "event" : "events"}</p></div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {eventItems.slice(1).map((event) => (
                <article key={event.id} className="group overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_34px_-24px_rgba(34,47,87,.45)]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-ink-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(event.image_path)} alt={event.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <time className="absolute bottom-4 left-4 rounded bg-white/95 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-700">{formatDate(event.event_date)}</time>
                  </div>
                  <div className="p-6"><h3 className="font-display text-2xl leading-tight text-ink-700">{event.title}</h3><p className="mt-3 line-clamp-3 whitespace-pre-line leading-7 text-slate/70">{event.description || "More details about this school event will be shared soon."}</p></div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
