import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const [{ data: event }, { data: images }] = await Promise.all([
    supabase.from("events").select("id, title, description, event_date, image_path").eq("id", params.id).single(),
    supabase.from("event_images").select("id, image_path, caption").eq("event_id", params.id).order("created_at", { ascending: false }),
  ]);
  if (!event) notFound();
  const imageUrl = (path: string | null) => !path ? "/about-school.jpg" : path.startsWith("http") ? path : supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16"><Link href="/events" className="text-sm font-semibold text-gold-600 hover:text-gold-700">← Back to events</Link><div className="mt-8 grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div className="overflow-hidden rounded-2xl shadow-sm"><img src={imageUrl(event.image_path)} alt={event.title} className="h-64 w-full object-cover sm:h-80 lg:h-[26rem]" /></div><div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">School event</p><h1 className="mt-3 break-words font-display text-3xl text-ink-700 sm:text-5xl">{event.title}</h1><p className="mt-4 text-sm font-semibold text-slate/55">{formatDate(event.event_date)}</p><div className="mt-5 rounded-xl border border-gold-200 border-l-4 border-l-gold-500 bg-gold-50/50 px-4 py-4 sm:px-6"><p className="whitespace-pre-line break-words text-[15px] leading-7 text-ink-700 [overflow-wrap:anywhere]">{event.description || "More details about this school event will be shared soon."}</p></div></div></div>{(images ?? []).length > 0 && <section className="mt-14"><h2 className="font-display text-3xl text-ink-700">Event gallery</h2><div className="mt-7 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{images?.map((image) => <figure key={image.id} className="overflow-hidden rounded-lg border border-ink-100 bg-white"><img src={imageUrl(image.image_path)} alt={image.caption || event.title} className="aspect-square w-full object-cover" />{image.caption && <figcaption className="break-words p-2 text-xs text-slate/60">{image.caption}</figcaption>}</figure>)}</div></section>}</div>;
}
