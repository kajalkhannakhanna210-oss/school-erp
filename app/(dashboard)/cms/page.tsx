import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CmsTabs } from "./cms-tabs";

export default async function CmsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  const [
    { data: pages },
    { data: notices },
    { data: albums },
    { data: images },
    { data: events },
    { data: eventImages },
    { data: messages },
    { data: settingsRows },
  ] = await Promise.all([
    supabase.from("site_pages").select("*").order("slug"),
    supabase.from("notices").select("*").order("publish_date", { ascending: false }),
    supabase.from("gallery_albums").select("*").order("created_at", { ascending: false }),
    supabase.from("gallery_images").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("event_date", { ascending: false }),
    supabase.from("event_images").select("*").order("created_at", { ascending: false }),
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key, value"),
  ]);

  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-700">Website CMS</h1>
      <p className="mt-1 text-sm text-slate/60">
        Everything on the public site — no code changes needed for content updates.
      </p>
      <CmsTabs
        pages={pages ?? []}
        notices={notices ?? []}
        albums={albums ?? []}
        images={images ?? []}
        events={events ?? []}
        eventImages={eventImages ?? []}
        messages={messages ?? []}
        settings={settings}
      />
    </div>
  );
}
