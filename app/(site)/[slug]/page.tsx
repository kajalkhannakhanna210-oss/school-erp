import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SLUGS = new Set([
  "about",
  "principal-message",
  "chairman-message",
  "facilities",
  "academics",
  "admissions",
]);

export default async function SitePage({ params }: { params: { slug: string } }) {
  if (!ALLOWED_SLUGS.has(params.slug)) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase.from("site_pages").select("*").eq("slug", params.slug).single();

  if (!page) notFound();

  let imageUrl: string | null = null;
  if (page.image_path) {
    const { data } = supabase.storage.from("site-media").getPublicUrl(page.image_path);
    imageUrl = data.publicUrl;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">{page.title}</h1>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={page.title} className="mt-8 max-h-96 w-full rounded-lg object-cover" />
      )}
      <div className="mt-8 whitespace-pre-line text-slate/80">{page.content || "Content coming soon."}</div>
    </div>
  );
}
