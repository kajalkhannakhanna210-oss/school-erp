"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { createClient } from "@/lib/supabase/client";
import {
  addGalleryImage,
  addEventImage,
  createAlbum,
  createEvent,
  createNotice,
  deleteAlbum,
  deleteEvent,
  deleteGalleryImage,
  deleteMessage,
  deleteNotice,
  saveSettings,
  savePage,
  setMessageRead,
  setPageImage,
} from "./actions";

type SitePage = { slug: string; title: string; content: string; image_path: string | null };
type Notice = { id: string; title: string; body: string; publish_date: string };
type Album = { id: string; title: string };
type GalleryImage = { id: string; album_id: string; image_path: string; caption: string | null };
type EventRow = { id: string; title: string; description: string; event_date: string; image_path: string | null };
type EventImage = { id: string; event_id: string; image_path: string; caption: string | null };
type ContactMessage = { id: string; name: string; email: string; phone: string | null; message: string; is_read: boolean; created_at: string };
type Settings = Record<string, string>;

const MAX_PAGE_IMAGE_SIZE = 5 * 1024 * 1024;
const PAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const TABS = ["pages", "notices", "gallery", "events", "messages", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  pages: "Pages",
  notices: "Notices",
  gallery: "Gallery",
  events: "Events",
  messages: "Messages",
  settings: "Settings",
};

export function CmsTabs({
  pages,
  notices,
  albums,
  images,
  events,
  eventImages,
  messages,
  settings,
}: {
  pages: SitePage[];
  notices: Notice[];
  albums: Album[];
  images: GalleryImage[];
  events: EventRow[];
  eventImages: EventImage[];
  messages: ContactMessage[];
  settings: Settings;
}) {
  const [tab, setTab] = useState<Tab>("pages");
  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-gold text-ink-700" : "text-slate/50"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "messages" && unreadCount > 0 && <span className="ml-1 text-xs text-danger">({unreadCount})</span>}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "pages" && <PagesTab pages={pages} />}
        {tab === "notices" && <NoticesTab notices={notices} />}
        {tab === "gallery" && <GalleryTab albums={albums} images={images} />}
        {tab === "events" && <EventsTab events={events} eventImages={eventImages} />}
        {tab === "messages" && <MessagesTab messages={messages} />}
        {tab === "settings" && <SettingsTab settings={settings} />}
      </div>
    </div>
  );
}

function PagesTab({ pages }: { pages: SitePage[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(pages[0]?.slug ?? "");
  const current = pages.find((p) => p.slug === slug);
  const isAboutPage = slug === "about";
  const [title, setTitle] = useState(current?.title ?? "");
  const [content, setContent] = useState(current?.content ?? "");
  const [file, setFile] = useState<File | null>(null);

  function selectPage(newSlug: string) {
    setSlug(newSlug);
    const p = pages.find((pg) => pg.slug === newSlug);
    setTitle(p?.title ?? "");
    setContent(p?.content ?? "");
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      push("Title and content are required.", "error");
      return;
    }
    startTransition(async () => {
      const { error } = await savePage(slug, { title, content });
      if (error) {
        push(error, "error");
        return;
      }
      push("Page saved");
    });
  }

  function handleUploadImage() {
    if (!file) return;
    if (!PAGE_IMAGE_TYPES.has(file.type)) {
      push("Use a JPG, PNG, or WebP image.", "error");
      return;
    }
    if (file.size > MAX_PAGE_IMAGE_SIZE) {
      push("Image size must be 5 MB or less.", "error");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `pages/${slug}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("site-media").upload(path, file, { upsert: true });
      if (uploadError) {
        push(uploadError.message, "error");
        return;
      }
      const { error } = await setPageImage(slug, path);
      if (error) {
        push(error, "error");
        return;
      }
      push("Page image updated");
      setFile(null);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Card>
        <ul className="space-y-1 text-sm">
          {pages.map((p) => (
            <li key={p.slug}>
              <button
                onClick={() => selectPage(p.slug)}
                className={`w-full rounded-md px-3 py-2 text-left ${
                  p.slug === slug ? "bg-ink-50 font-medium text-ink-700" : "text-slate hover:bg-ink-50"
                }`}
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        {!isAboutPage ? <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="page-title">Title</Label>
            <Input id="page-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="page-content">Content</Label>
            <textarea
              id="page-content"
              rows={10}
              required
              maxLength={10000}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-gold"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Save page
          </Button>
        </form> : <p className="text-sm leading-6 text-slate/70">The About page uses a fixed school profile. You can update its photograph below.</p>}
        <div className="mt-6 border-t border-ink-100 pt-4">
          <Label>Page image</Label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <Button variant="ghost" onClick={handleUploadImage} disabled={!file || pending}>
              Upload
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate/50">JPG, PNG, or WebP; maximum 5 MB.</p>
        </div>
      </Card>
    </div>
  );
}

function NoticesTab({ notices }: { notices: Notice[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ title: "", body: "", publish_date: new Date().toISOString().slice(0, 10) });
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createNotice(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Notice created");
      setForm({ title: "", body: "", publish_date: new Date().toISOString().slice(0, 10) });
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const { error } = await deleteNotice(deleteTarget.id);
      setDeleteTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Notice deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New notice</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="n-title">Title</Label>
            <Input id="n-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="n-body">Body</Label>
            <textarea
              id="n-body"
              required
              rows={5}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-slate"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="n-date">Publish date</Label>
            <Input
              id="n-date"
              type="date"
              required
              value={form.publish_date}
              onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate/50">A future date keeps this hidden from everyone but you until then.</p>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add notice
          </Button>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-ink-100">
          {notices.map((n) => (
            <li key={n.id} className="flex items-start justify-between py-3">
              <div>
                <p className="font-medium text-ink-700">{n.title}</p>
                <p className="text-xs text-slate/50">{n.publish_date}</p>
              </div>
              <Button variant="ghost" onClick={() => setDeleteTarget(n)}>
                Delete
              </Button>
            </li>
          ))}
          {notices.length === 0 && <li className="py-6 text-center text-sm text-slate/50">No notices yet.</li>}
        </ul>
      </Card>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete notice?"
        description="It disappears from the public site and every dashboard immediately."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function GalleryTab({ albums, images }: { albums: Album[]; images: GalleryImage[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [albumTitle, setAlbumTitle] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState(albums[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [deleteAlbumTarget, setDeleteAlbumTarget] = useState<Album | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<GalleryImage | null>(null);

  const albumImages = images.filter((i) => i.album_id === selectedAlbum);

  function handleCreateAlbum(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createAlbum(albumTitle);
      if (error) {
        push(error, "error");
        return;
      }
      push("Album created");
      setAlbumTitle("");
    });
  }

  function handleUploadImage() {
    if (!files.length || !selectedAlbum) return;
    const invalidFile = files.find((image) => !PAGE_IMAGE_TYPES.has(image.type) || image.size > MAX_UPLOAD_SIZE);
    if (invalidFile) {
      push("Each image must be a JPG, PNG, or WebP and no larger than 5 MB.", "error");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      let uploaded = 0;
      for (const [index, image] of files.entries()) {
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `gallery/${selectedAlbum}/${Date.now()}-${index}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("site-media").upload(path, image);
        if (uploadError) {
          push(uploadError.message, "error");
          break;
        }
        const { error } = await addGalleryImage(selectedAlbum, path, caption);
        if (error) {
          push(error, "error");
          break;
        }
        uploaded += 1;
      }
      if (uploaded) push(`${uploaded} image${uploaded === 1 ? "" : "s"} added`);
      setFiles([]);
      setCaption("");
    });
  }

  function handleDeleteAlbum() {
    if (!deleteAlbumTarget) return;
    startTransition(async () => {
      const { error } = await deleteAlbum(deleteAlbumTarget.id);
      setDeleteAlbumTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Album deleted");
    });
  }

  function handleDeleteImage() {
    if (!deleteImageTarget) return;
    startTransition(async () => {
      const { error } = await deleteGalleryImage(deleteImageTarget.id);
      setDeleteImageTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Image deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">Albums</h2>
        <form onSubmit={handleCreateAlbum} className="mt-4 flex gap-2">
          <Input placeholder="New album" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          <Button type="submit" variant="ghost" disabled={pending}>
            Add
          </Button>
        </form>
        <ul className="mt-4 space-y-1 text-sm">
          {albums.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <button
                onClick={() => setSelectedAlbum(a.id)}
                className={`flex-1 rounded-md px-3 py-2 text-left ${
                  a.id === selectedAlbum ? "bg-ink-50 font-medium text-ink-700" : "text-slate hover:bg-ink-50"
                }`}
              >
                {a.title}
              </button>
              <Button variant="ghost" onClick={() => setDeleteAlbumTarget(a)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        {!selectedAlbum ? (
          <p className="text-sm text-slate/50">Create an album to add photos.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm" />
              <Input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
              <Button variant="ghost" onClick={handleUploadImage} disabled={!files.length || pending}>
                Upload {files.length > 1 ? `${files.length} images` : "image"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate/50">Select multiple JPG, PNG, or WebP images (up to 5 MB each).</p>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {albumImages.map((img) => (
                <div key={img.id} className="relative">
                  <div className="flex h-24 items-center justify-center rounded-md bg-ink-50 text-xs text-slate/40">
                    {img.caption || "Photo"}
                  </div>
                  <Button variant="ghost" onClick={() => setDeleteImageTarget(img)} className="mt-1 w-full">
                    Delete
                  </Button>
                </div>
              ))}
              {albumImages.length === 0 && <p className="col-span-full text-sm text-slate/50">No photos yet.</p>}
            </div>
          </>
        )}
      </Card>
      <ConfirmDialog
        open={!!deleteAlbumTarget}
        title="Delete album?"
        description="All photos in this album are removed too."
        onConfirm={handleDeleteAlbum}
        onCancel={() => setDeleteAlbumTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteImageTarget}
        title="Delete photo?"
        description="This removes it from the public gallery."
        onConfirm={handleDeleteImage}
        onCancel={() => setDeleteImageTarget(null)}
      />
    </div>
  );
}

function EventsTab({ events, eventImages }: { events: EventRow[]; eventImages: EventImage[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ title: "", description: "", event_date: "", image_path: "" });
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error, id } = await createEvent(form);
      if (error) {
        push(error, "error");
        return;
      }
      push("Event created");
      setForm({ title: "", description: "", event_date: "", image_path: "" });
      if (id) setSelectedEvent(id);
    });
  }

  function handleUploadImages() {
    if (!selectedEvent || !files.length) return;
    const invalidFile = files.find((image) => !PAGE_IMAGE_TYPES.has(image.type) || image.size > MAX_UPLOAD_SIZE);
    if (invalidFile) {
      push("Each image must be a JPG, PNG, or WebP and no larger than 5 MB.", "error");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      let uploaded = 0;
      for (const [index, image] of files.entries()) {
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `events/${selectedEvent}/${Date.now()}-${index}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("site-media").upload(path, image);
        if (uploadError) {
          push(uploadError.message, "error");
          break;
        }
        const { error } = await addEventImage(selectedEvent, path, caption);
        if (error) {
          push(error, "error");
          break;
        }
        uploaded += 1;
      }
      if (uploaded) push(`${uploaded} event image${uploaded === 1 ? "" : "s"} added`);
      setFiles([]);
      setCaption("");
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const { error } = await deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Event deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New event</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="e-date">Date</Label>
            <Input
              id="e-date"
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-desc">Description</Label>
            <textarea
              id="e-desc"
              rows={4}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm text-slate"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-image">Banner image URL</Label>
            <Input
              id="e-image"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={form.image_path}
              onChange={(e) => setForm({ ...form, image_path: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add event
          </Button>
        </form>
      </Card>
      <Card>
        <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
          <Label htmlFor="event-photo-upload">Event photo gallery</Label>
          <select id="event-photo-upload" className="mt-1 w-full" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="">Choose an event</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title} — {event.event_date}</option>)}
          </select>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!selectedEvent} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm" />
            <Input placeholder="Caption for these images (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <Button variant="ghost" onClick={handleUploadImages} disabled={!selectedEvent || !files.length || pending}>Upload {files.length > 1 ? `${files.length} images` : "image"}</Button>
          </div>
          <p className="mt-2 text-xs text-slate/50">Select multiple JPG, PNG, or WebP images (up to 5 MB each) for the selected event.</p>
          {selectedEvent && <p className="mt-2 text-xs font-medium text-ink-700">{eventImages.filter((image) => image.event_id === selectedEvent).length} event photos uploaded</p>}
        </div>
        <ul className="divide-y divide-ink-100">
          {events.map((e) => (
            <li key={e.id} className="flex items-start justify-between py-3">
              <div>
                <p className="font-mono text-xs text-slate/50">{e.event_date}</p>
                <p className="font-medium text-ink-700">{e.title}</p>
              </div>
              <Button variant="ghost" onClick={() => setDeleteTarget(e)}>
                Delete
              </Button>
            </li>
          ))}
          {events.length === 0 && <li className="py-6 text-center text-sm text-slate/50">No events yet.</li>}
        </ul>
      </Card>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete event?"
        description="It disappears from the public site immediately."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MessagesTab({ messages }: { messages: ContactMessage[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  function toggleRead(m: ContactMessage) {
    startTransition(async () => {
      const { error } = await setMessageRead(m.id, !m.is_read);
      if (error) push(error, "error");
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const { error } = await deleteMessage(deleteTarget.id);
      setDeleteTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Message deleted");
    });
  }

  return (
    <div>
      <ul className="space-y-3">
        {messages.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-ink-700">
                  {m.name} <span className="font-normal text-slate/50">· {m.email}</span>
                  {m.phone && <span className="font-normal text-slate/50"> · {m.phone}</span>}
                </p>
                <p className="mt-1 text-xs text-slate/50">{new Date(m.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {!m.is_read && <Badge>Unread</Badge>}
                <Button variant="ghost" onClick={() => toggleRead(m)} disabled={pending}>
                  {m.is_read ? "Mark unread" : "Mark read"}
                </Button>
                <Button variant="ghost" onClick={() => setDeleteTarget(m)}>
                  Delete
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate/80">{m.message}</p>
          </Card>
        ))}
        {messages.length === 0 && <p className="py-6 text-center text-sm text-slate/50">No messages yet.</p>}
      </ul>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete message?"
        description="This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SettingsTab({ settings }: { settings: Settings }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Settings>(settings);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await saveSettings(values);
      if (error) {
        push(error, "error");
        return;
      }
      push("Settings saved");
    });
  }

  const fields: { key: string; label: string }[] = [
    { key: "school_name", label: "School name" },
    { key: "contact_email", label: "Contact email" },
    { key: "contact_phone", label: "Contact phone" },
    { key: "contact_address", label: "Contact address" },
    { key: "facebook_url", label: "Facebook URL" },
    { key: "twitter_url", label: "Twitter URL" },
    { key: "instagram_url", label: "Instagram URL" },
  ];

  return (
    <Card className="max-w-lg">
      <form onSubmit={handleSave} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
      </form>
    </Card>
  );
}
