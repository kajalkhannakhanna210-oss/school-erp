import { createClient } from "@/lib/supabase/server";

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data: notices } = await supabase
    .from("notices")
    .select("*")
    .lte("publish_date", new Date().toISOString().slice(0, 10))
    .order("publish_date", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink-700">Notices</h1>

      <div className="mt-10 space-y-6">
        {(notices ?? []).map((n) => {
          const attachmentUrl = n.attachment_path
            ? supabase.storage.from("site-media").getPublicUrl(n.attachment_path).data.publicUrl
            : null;
          return (
            <div key={n.id} className="border-b border-ink-100 pb-6">
              <p className="font-mono text-xs text-slate/50">{n.publish_date}</p>
              <h2 className="font-display text-lg text-ink-700">{n.title}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-slate/70">{n.body}</p>
              {attachmentUrl && (
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-ink-600 hover:underline">
                  Download attachment
                </a>
              )}
            </div>
          );
        })}
        {(notices ?? []).length === 0 && <p className="text-sm text-slate/50">No notices yet.</p>}
      </div>
    </div>
  );
}
