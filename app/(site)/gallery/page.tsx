import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function GalleryPage() {
  const supabase = await createClient();
  const [{ data: albums }, { data: images }] = await Promise.all([
    supabase.from("gallery_albums").select("id, title, description").order("created_at", { ascending: false }),
    supabase.from("gallery_images").select("id, album_id, image_path, caption").order("created_at", { ascending: false }),
  ]);
  const imagesByAlbum = new Map<string, NonNullable<typeof images>>();
  for (const image of images ?? []) imagesByAlbum.set(image.album_id, [...(imagesByAlbum.get(image.album_id) ?? []), image]);

  return <div className="bg-paper pb-20"><section className="relative overflow-hidden bg-ink-900 py-20 text-paper sm:py-24"><div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full border-[48px] border-gold/15" /><div className="relative mx-auto max-w-6xl px-6"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold">Memories & moments</p><h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">Life on campus, captured in every frame.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-paper/75">Explore the celebrations, learning experiences, friendships, and special moments that make our school community unique.</p></div></section><main className="mx-auto max-w-6xl px-6"><div className="relative z-10 -mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {(albums ?? []).map((album) => { const cover = imagesByAlbum.get(album.id)?.[0]; const imageUrl = cover ? (cover.image_path.startsWith("http") ? cover.image_path : supabase.storage.from("site-media").getPublicUrl(cover.image_path).data.publicUrl) : null; return <Link key={album.id} href={`/gallery/${album.id}`} className="group overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-gold-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-gold-100"><div className="overflow-hidden">{imageUrl ? <img src={imageUrl} alt={cover?.caption ?? album.title} className="h-60 w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-60 place-items-center bg-ink-50 text-sm text-slate/50">No photos yet</div>}</div><div className="p-5"><h2 className="font-display text-xl text-ink-700 group-hover:text-gold-600">{album.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate/65">{album.description || "Explore this gallery"}</p><span className="mt-4 flex min-h-11 w-full items-center justify-between rounded-lg bg-ink-700 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-gold-600"><span>View gallery</span><span aria-hidden="true" className="text-lg leading-none">→</span></span></div></Link>; })}
    {(albums ?? []).length === 0 && <p className="text-sm text-slate/50">No galleries yet.</p>}
  </div></main></div>;
}
