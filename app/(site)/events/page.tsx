import { createClient } from "@/lib/supabase/server";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*").order("event_date", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">Events</h1>

      <div className="mt-10 space-y-6">
        {(events ?? []).map((event) => {
          const imageUrl = event.image_path
            ? supabase.storage.from("site-media").getPublicUrl(event.image_path).data.publicUrl
            : null;
          return (
            <div key={event.id} className="flex gap-6 rounded-lg border border-ink-100 bg-white p-6">
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={event.title} className="h-24 w-24 flex-shrink-0 rounded-md object-cover" />
              )}
              <div>
                <p className="font-mono text-xs text-slate/50">{event.event_date}</p>
                <h2 className="font-display text-lg text-ink-700">{event.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate/70">{event.description}</p>
              </div>
            </div>
          );
        })}
        {(events ?? []).length === 0 && <p className="text-sm text-slate/50">No events scheduled yet.</p>}
      </div>
    </div>
  );
}
