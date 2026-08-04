import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function GalleryDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const [{ data: album }, { data: images }] = await Promise.all([
    supabase.from("gallery_albums").select("id, title, description, gallery_date").eq("id", params.id).single(),
    supabase.from("gallery_images").select("id, image_path, caption").eq("album_id", params.id).order("created_at", { ascending: false }),
  ]);
  if (!album) notFound();
  const banner = { caption: null as string | null };
  const bannerUrl = null;
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16"><Link href="/gallery" className="text-sm font-semibold text-gold-600 hover:text-gold-700">← Back to gallery</Link>{bannerUrl && <div className="mt-7 overflow-hidden rounded-2xl shadow-sm"><img src={bannerUrl} alt={banner?.caption ?? album.title} className="h-56 w-full object-cover sm:h-80 lg:h-[26rem]" /></div>}<p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Gallery</p><h1 className="mt-3 break-words font-display text-3xl text-ink-700 sm:text-4xl">{album.title}</h1><div className="mt-5 max-w-4xl rounded-xl border border-gold-200 border-l-4 border-l-gold-500 bg-gold-50/50 px-4 py-4 sm:px-6"><p className="break-words text-[15px] leading-7 text-ink-700 [overflow-wrap:anywhere]">{album.description || "No description has been added yet."}</p></div>{album.gallery_date && <p className="mt-3 text-sm font-medium text-slate/50">{album.gallery_date}</p>}<div className="mt-10 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{(images ?? []).map((image) => { const url = image.image_path.startsWith("http") ? image.image_path : supabase.storage.from("site-media").getPublicUrl(image.image_path).data.publicUrl; return <figure key={image.id} className="overflow-hidden rounded-lg border border-ink-100 bg-white"><img src={url} alt={image.caption ?? album.title} className="aspect-square w-full object-cover" />{image.caption && <figcaption className="break-words p-2 text-xs text-slate/60">{image.caption}</figcaption>}</figure>; })}{(images ?? []).length === 0 && <p className="col-span-full text-sm text-slate/50">No photos in this gallery yet.</p>}</div></div>;
}
