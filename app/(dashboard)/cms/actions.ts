"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePage(slug: string, input: { title: string; content: string; image_path?: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_pages")
    .update({ title: input.title, content: input.content, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  revalidatePath("/cms");
  revalidatePath(`/${slug === "home" ? "" : slug}`);
  return { error: error?.message ?? null };
}

export async function setPageImage(slug: string, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("site_pages").update({ image_path: path }).eq("slug", slug);
  revalidatePath("/cms");
  return { error: error?.message ?? null };
}

export async function createNotice(input: { title: string; body: string; publish_date: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").insert(input);
  revalidatePath("/cms");
  revalidatePath("/notices");
  return { error: error?.message ?? null };
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/notices");
  return { error: error?.message ?? null };
}

export async function createAlbum(title: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_albums").insert({ title });
  revalidatePath("/cms");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function deleteAlbum(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function addGalleryImage(albumId: string, path: string, caption: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_images")
    .insert({ album_id: albumId, image_path: path, caption: caption || null });
  revalidatePath("/cms");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function deleteGalleryImage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  revalidatePath("/cms");
  revalidatePath("/gallery");
  return { error: error?.message ?? null };
}

export async function createEvent(input: { title: string; description: string; event_date: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(input);
  revalidatePath("/cms");
  revalidatePath("/events");
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  revalidatePath("/cms");
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
