import { createClient } from "@/lib/supabase/server";

// CMS updates appear within a minute without requiring a database request per visitor.
export const revalidate = 60;

export default async function GalleryPage() {
  const supabase = await createClient();
  const [{ data: albums }, { data: images }] = await Promise.all([
    supabase.from("gallery_albums").select("id, title").order("created_at", { ascending: false }),
    supabase.from("gallery_images").select("id, album_id, image_path, caption").order("created_at", { ascending: false }),
  ]);

  const imagesByAlbum = new Map<string, typeof images>();
  for (const img of images ?? []) {
    if (!imagesByAlbum.has(img.album_id)) imagesByAlbum.set(img.album_id, []);
    imagesByAlbum.get(img.album_id)!.push(img);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">Gallery</h1>

      <div className="mt-10 space-y-12">
        {(albums ?? []).map((album) => {
          const albumImages = imagesByAlbum.get(album.id) ?? [];
          return (
            <div key={album.id}>
              <h2 className="font-display text-xl text-ink-700">{album.title}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {albumImages.map((img) => {
                  const imageUrl = img.image_path.startsWith("http")
                    ? img.image_path
                    : supabase.storage.from("site-media").getPublicUrl(img.image_path).data.publicUrl;
                  return (
                    <figure key={img.id} className="overflow-hidden rounded-lg border border-ink-100 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt={img.caption ?? album.title} className="h-40 w-full object-cover" />
                      {img.caption && <figcaption className="p-2 text-xs text-slate/60">{img.caption}</figcaption>}
                    </figure>
                  );
                })}
                {albumImages.length === 0 && <p className="text-sm text-slate/50">No photos in this album yet.</p>}
              </div>
            </div>
          );
        })}
        {(albums ?? []).length === 0 && <p className="text-sm text-slate/50">No albums yet.</p>}
      </div>
    </div>
  );
}
