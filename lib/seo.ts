import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";

export async function getPageMetadata(path: string, fallback: Metadata): Promise<Metadata> {
  try {
    const { data } = await createPublicClient().from("site_seo_metadata").select("title, description, canonical_path, og_title, og_description, og_image, indexable").eq("path", path).maybeSingle();
    if (!data) return fallback;
    const canonical = data.canonical_path || path;
    return {
      ...fallback,
      title: data.title || fallback.title,
      description: data.description || fallback.description,
      alternates: { canonical },
      robots: { index: data.indexable, follow: data.indexable },
      openGraph: { ...(fallback.openGraph ?? {}), title: data.og_title || data.title || fallback.title, description: data.og_description || data.description || fallback.description, url: canonical, ...(data.og_image ? { images: [{ url: data.og_image }] } : {}) },
    };
  } catch {
    return fallback;
  }
}
