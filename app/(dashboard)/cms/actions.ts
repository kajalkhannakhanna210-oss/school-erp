"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SITE_PAGE_SLUGS = new Set(["home", "principal-message", "chairman-message", "facilities", "academics", "admissions"]);
const PAGE_IMAGE_SLUGS = new Set([...SITE_PAGE_SLUGS, "about"]);

export async function savePage(slug: string, input: { title: string; content: string; image_path?: string | null }) {
  if (!SITE_PAGE_SLUGS.has(slug)) return { error: "Invalid page." };

  const title = input.title.trim();
  const content = input.content.trim();
  if (!title) return { error: "A page title is required." };
  if (!content) return { error: "Page content is required." };
  if (title.length > 160) return { error: "The title must be 160 characters or fewer." };
  if (content.length > 10000) return { error: "The content must be 10,000 characters or fewer." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_pages")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  revalidatePath("/cms");
  revalidatePath(`/${slug === "home" ? "" : slug}`);
  if (slug === "about") revalidatePath("/");
  return { error: error?.message ?? null };
}

export async function setPageImage(slug: string, path: string) {
  if (!PAGE_IMAGE_SLUGS.has(slug)) return { error: "Invalid page." };
  if (!path.startsWith(`pages/${slug}/`)) return { error: "Invalid image path." };

  const supabase = await createClient();
  const { error } = await supabase.from("site_pages").update({ image_path: path }).eq("slug", slug);
  revalidatePath("/cms");
  revalidatePath(`/${slug === "home" ? "" : slug}`);
  if (slug === "about") revalidatePath("/");
  return { error: error?.message ?? null };
}

export async function createNotice(input: { title: string; body: string; publish_date: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").insert(input);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/dashboard");
  return { error: error?.message ?? null };
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/dashboard");
  return { error: error?.message ?? null };
}

export async function createAlbum(input: { title: string; description: string; gallery_date: string }) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) return { error: "Gallery title is required.", id: null };
  if (title.length > 120) return { error: "Gallery title must be 120 characters or fewer.", id: null };
  if (description.length > 500) return { error: "Gallery description must be 500 characters or fewer.", id: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.gallery_date)) return { error: "A valid gallery date is required.", id: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("gallery_albums").insert({ title, description, gallery_date: input.gallery_date }).select("id").single();
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/gallery");
  return { error: error?.message ?? null, id: data?.id ?? null };
}

export async function updateAlbum(id: string, input: { title: string; description: string; gallery_date: string }) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) return { error: "Gallery title is required." };
  if (title.length > 120) return { error: "Gallery title must be 120 characters or fewer." };
  if (description.length > 500) return { error: "Gallery description must be 500 characters or fewer." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.gallery_date)) return { error: "A valid gallery date is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_albums").update({ title, description, gallery_date: input.gallery_date, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/cms"); revalidatePath("/"); revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function deleteAlbum(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function addGalleryImage(albumId: string, path: string, caption: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_images")
    .insert({ album_id: albumId, image_path: path, caption: caption || null });
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function deleteGalleryImage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function updateGalleryImage(id: string, caption: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_images").update({ caption: caption.trim() || null }).eq("id", id);
  revalidatePath("/cms"); revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function createEvent(input: { title: string; description: string; event_date: string; image_path?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").insert({
    ...input,
    image_path: input.image_path?.trim() || null,
  }).select("id").single();
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/events");
  return { error: error?.message ?? null, id: data?.id ?? null };
}

export async function addEventImage(eventId: string, path: string, caption: string) {
  if (!path.startsWith(`events/${eventId}/`)) return { error: "Invalid image path." };
  const supabase = await createClient();
  const { error } = await supabase.from("event_images").insert({ event_id: eventId, image_path: path, caption: caption || null });
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function updateEvent(id: string, input: { title: string; description: string; event_date: string; image_path?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ ...input, title: input.title.trim(), description: input.description.trim(), image_path: input.image_path?.trim() || null }).eq("id", id);
  revalidatePath("/cms"); revalidatePath("/"); revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function updateEventImage(id: string, caption: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_images").update({ caption: caption.trim() || null, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/cms"); revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function deleteEventImage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_images").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/");
  revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function setMessageRead(id: string, isRead: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
  revalidatePath("/cms");
  return { error: error?.message ?? null };
}

export async function deleteMessage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  revalidatePath("/cms");
  return { error: error?.message ?? null };
}

export async function saveSettings(values: Record<string, string>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      Object.entries(values).map(([key, value]) => ({ key, value })),
      { onConflict: "key" }
    );
  revalidatePath("/cms");
  revalidatePath("/", "layout");
  return { error: error?.message ?? null };
}

export async function saveSeoMetadata(input: { path: string; title: string; description: string; canonical_path: string; og_title: string; og_description: string; og_image: string; indexable: boolean }) {
  if (!input.path.startsWith("/")) return { error: "SEO path must start with /." };
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length > 160) return { error: "SEO title must be 160 characters or fewer." };
  if (description.length > 320) return { error: "Meta description must be 320 characters or fewer." };
  const supabase = await createClient();
  const { error } = await supabase.from("site_seo_metadata").upsert({ ...input, title: title || null, description: description || null, canonical_path: input.canonical_path.trim() || input.path, og_title: input.og_title.trim() || null, og_description: input.og_description.trim() || null, og_image: input.og_image.trim() || null, updated_at: new Date().toISOString() }, { onConflict: "path" });
  revalidatePath("/cms");
  revalidatePath(input.path === "/" ? "/" : input.path);
  return { error: error?.message ?? null };
}
