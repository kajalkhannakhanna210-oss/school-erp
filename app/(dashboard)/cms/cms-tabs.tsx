"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
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
  deleteEventImage,
  deleteGalleryImage,
  updateAlbum,
  updateGalleryImage,
  updateEvent,
  updateEventImage,
  deleteMessage,
  deleteNotice,
  saveSettings,
  savePage,
  setMessageRead,
  setPageImage,
  saveSeoMetadata,
} from "./actions";

type SitePage = { slug: string; title: string; content: string; image_path: string | null };
type Notice = { id: string; title: string; body: string; publish_date: string };
type Album = { id: string; title: string; description?: string; gallery_date?: string };
type GalleryImage = { id: string; album_id: string; image_path: string; caption: string | null };
type EventRow = { id: string; title: string; description: string; event_date: string; image_path: string | null };
type EventImage = { id: string; event_id: string; image_path: string; caption: string | null };
type ContactMessage = { id: string; name: string; email: string; phone: string | null; message: string; is_read: boolean; created_at: string };
type Settings = Record<string, string>;
type SeoRow = { path: string; title: string | null; description: string | null; canonical_path: string | null; og_title: string | null; og_description: string | null; og_image: string | null; indexable: boolean };

const MAX_PAGE_IMAGE_SIZE = 5 * 1024 * 1024;
const PAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_FILES = 20;

function mediaUrl(path: string) {
  return path.startsWith("http") ? path : createClient().storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

function SelectedImagePreviews({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  if (!files.length) return null;
  return <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="group relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50"><img src={urls[index]} alt={file.name} className="aspect-square w-full object-cover" /><button type="button" onClick={() => onRemove(index)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-900/80 text-sm font-bold text-white opacity-100 transition hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Remove ${file.name}`}>×</button><p className="truncate px-2 py-1.5 text-xs text-slate/60">{file.name}</p></div>)}</div>;
}

const TABS = ["pages", "seo", "notices", "gallery", "events", "messages", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  pages: "Pages",
  seo: "SEO",
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
  seo,
}: {
  pages: SitePage[];
  notices: Notice[];
  albums: Album[];
  images: GalleryImage[];
  events: EventRow[];
  eventImages: EventImage[];
  messages: ContactMessage[];
  settings: Settings;
  seo: SeoRow[];
}) {
  const [tab, setTab] = useState<Tab>("pages");
  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="mt-6 min-w-0 max-w-full overflow-hidden">
      <div className="flex max-w-full gap-2 overflow-x-auto border-b border-ink-100 pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium ${
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
        {tab === "seo" && <SeoTab rows={seo} />}
        {tab === "notices" && <NoticesTab notices={notices} />}
        {tab === "gallery" && <GalleryTab albums={albums} images={images} />}
        {tab === "events" && <EventsTab events={events} eventImages={eventImages} />}
        {tab === "messages" && <MessagesTab messages={messages} />}
        {tab === "settings" && <SettingsTab settings={settings} />}
      </div>
    </div>
  );
}

function SeoTab({ rows }: { rows: SeoRow[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [path, setPath] = useState(rows[0]?.path ?? "/");
  const current = rows.find((row) => row.path === path);
  const [form, setForm] = useState({ title: current?.title ?? "", description: current?.description ?? "", canonical_path: current?.canonical_path ?? path, og_title: current?.og_title ?? "", og_description: current?.og_description ?? "", og_image: current?.og_image ?? "", indexable: current?.indexable ?? true });

  function selectPath(nextPath: string) {
    const row = rows.find((item) => item.path === nextPath);
    setPath(nextPath);
    setForm({ title: row?.title ?? "", description: row?.description ?? "", canonical_path: row?.canonical_path ?? nextPath, og_title: row?.og_title ?? "", og_description: row?.og_description ?? "", og_image: row?.og_image ?? "", indexable: row?.indexable ?? true });
  }

  function save(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveSeoMetadata({ path, ...form });
      push(result.error ?? "SEO metadata saved", result.error ? "error" : "success");
    });
  }

  if (!rows.length) return <Card><p className="text-sm text-slate/70">Run the SEO metadata migration before editing page SEO.</p></Card>;
  return <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
    <Card><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate/50">Public pages</p><div className="space-y-1">{rows.map((row) => <button key={row.path} type="button" onClick={() => selectPath(row.path)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${row.path === path ? "bg-ink-50 font-medium text-ink-700" : "text-slate hover:bg-ink-50"}`}>{row.path === "/" ? "Homepage" : row.path}</button>)}</div></Card>
    <Card><form onSubmit={save} className="space-y-4"><div><Label htmlFor="seo-title">SEO title</Label><Input id="seo-title" maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><p className="mt-1 text-xs text-slate/50">Recommended: under 60 characters.</p></div><div><Label htmlFor="seo-description">Meta description</Label><textarea id="seo-description" maxLength={320} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm" /><p className="mt-1 text-xs text-slate/50">Recommended: 140–160 characters.</p></div><div><Label htmlFor="seo-canonical">Canonical path</Label><Input id="seo-canonical" value={form.canonical_path} onChange={(e) => setForm({ ...form, canonical_path: e.target.value })} placeholder="/about" /></div><div><Label htmlFor="seo-og-title">Social title</Label><Input id="seo-og-title" value={form.og_title} onChange={(e) => setForm({ ...form, og_title: e.target.value })} /></div><div><Label htmlFor="seo-og-description">Social description</Label><textarea id="seo-og-description" rows={3} value={form.og_description} onChange={(e) => setForm({ ...form, og_description: e.target.value })} className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm" /></div><div><Label htmlFor="seo-og-image">Open Graph image URL</Label><Input id="seo-og-image" value={form.og_image} onChange={(e) => setForm({ ...form, og_image: e.target.value })} placeholder="https://... or /about-school.jpg" /></div><label className="flex items-center gap-2 text-sm font-medium text-ink-700"><input type="checkbox" checked={form.indexable} onChange={(e) => setForm({ ...form, indexable: e.target.checked })} /> Allow search engines to index this page</label><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save SEO settings"}</Button></form></Card>
  </div>;
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
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumDate, setAlbumDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState(albums[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [deleteAlbumTarget, setDeleteAlbumTarget] = useState<Album | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<GalleryImage | null>(null);

  const albumImages = images.filter((i) => i.album_id === selectedAlbum);
  const selectedAlbumDetails = albums.find((album) => album.id === selectedAlbum);

  function handleCreateAlbum(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error, id } = await createAlbum({ title: albumTitle, description: albumDescription, gallery_date: albumDate });
      if (error) {
        push(error, "error");
        return;
      }
      push("Album created");
      setAlbumTitle("");
      setAlbumDescription("");
      if (id) setSelectedAlbum(id);
    });
  }

  function editAlbum(album: Album) {
    setEditingAlbum(album); setAlbumTitle(album.title); setAlbumDescription(album.description ?? ""); setAlbumDate(album.gallery_date ?? new Date().toISOString().slice(0, 10));
  }

  function saveAlbum(e: FormEvent) {
    e.preventDefault(); if (!editingAlbum) return;
    startTransition(async () => { const { error } = await updateAlbum(editingAlbum.id, { title: albumTitle, description: albumDescription, gallery_date: albumDate }); if (error) push(error, "error"); else { push("Gallery details updated"); setEditingAlbum(null); } });
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

  function handleFileSelection(fileList: FileList | null) {
    const selected = Array.from(fileList ?? []);
    const limited = selected.slice(0, MAX_GALLERY_FILES);
    if (selected.length > MAX_GALLERY_FILES) push(`You can upload up to ${MAX_GALLERY_FILES} images at a time.`, "error");
    const valid = limited.filter((image) => PAGE_IMAGE_TYPES.has(image.type) && image.size <= MAX_UPLOAD_SIZE);
    if (valid.length !== limited.length) push("Only JPG, PNG, or WebP images up to 5 MB are allowed.", "error");
    setFiles(valid);
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
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit min-w-0 border-ink-100 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-700">{editingAlbum ? "Edit gallery" : "New gallery"}</h2>
          {editingAlbum && <Button type="button" variant="ghost" onClick={() => { setEditingAlbum(null); setAlbumTitle(""); setAlbumDescription(""); setAlbumDate(new Date().toISOString().slice(0, 10)); }}>Cancel</Button>}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate/60">Add the gallery details first, then upload its photos from the manager.</p>
        <form onSubmit={editingAlbum ? saveAlbum : handleCreateAlbum} className="mt-4 min-w-0 space-y-4">
          <Input placeholder="Gallery title" maxLength={120} required value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          <div>
            <Label htmlFor="gallery-description" className="font-semibold text-ink-700">Description</Label>
            <div className="mt-1.5 overflow-hidden rounded-xl border border-gold-300 bg-gold-50/40 shadow-sm transition focus-within:border-gold-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-gold-100">
              <textarea id="gallery-description" placeholder="Write a short description about this gallery" maxLength={500} required rows={5} className="block min-h-32 w-full resize-y bg-transparent px-4 py-3 text-[15px] leading-6 text-ink-700 placeholder:text-slate/50 focus:outline-none" value={albumDescription} onChange={(e) => setAlbumDescription(e.target.value)} />
            </div>
            <p className="mt-1.5 text-right text-xs font-medium text-slate/60">{albumDescription.length}/500 characters</p>
          </div>
          <Input type="date" required value={albumDate} onChange={(e) => setAlbumDate(e.target.value)} />
          <Button type="submit" disabled={pending} className="w-full">{editingAlbum ? "Save gallery" : "Create gallery"}</Button>
        </form>
      </Card>
      <Card className="min-w-0 border-ink-100 shadow-sm">
        {!selectedAlbum ? (
          <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center">
            <p className="font-medium text-ink-700">No galleries yet</p>
            <p className="mt-1 text-sm text-slate/60">Create a gallery to start adding photos.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-ink-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <Label htmlFor="gallery-selector">Managing gallery</Label>
                <select id="gallery-selector" className="w-full" value={selectedAlbum} onChange={(e) => setSelectedAlbum(e.target.value)}>
                  {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                </select>
              </div>
              {selectedAlbumDetails && <div className="shrink-0 rounded-lg bg-ink-50 px-3 py-2 text-sm text-slate/60"><span className="font-medium text-ink-700">Gallery date</span><p>{selectedAlbumDetails.gallery_date || "Not set"}</p></div>}
            </div>
            {selectedAlbumDetails && <div className="mt-4 min-w-0 max-w-full rounded-xl border border-gold-200 border-l-4 border-l-gold-500 bg-gold-50/50 px-3.5 py-3.5 sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-700">About this gallery</p><p className="mt-2 max-w-full break-words text-[15px] leading-7 text-ink-700 [overflow-wrap:anywhere]">{selectedAlbumDetails.description || "No description has been added yet."}</p></div>}
            <div className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <Label htmlFor="gallery-image-upload">Add photos</Label>
                  <input id="gallery-image-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => handleFileSelection(e.target.files)} className="mt-1.5 block w-full min-w-0 text-sm" />
                </div>
                <Button type="button" onClick={handleUploadImage} disabled={!files.length || pending} className="w-full whitespace-nowrap sm:w-auto">
                  {pending ? "Uploading…" : `Upload ${files.length ? `${files.length} image${files.length === 1 ? "" : "s"}` : "images"}`}
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <Input placeholder="Caption for selected images (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <p className="text-xs text-slate/50 sm:text-right">JPG, PNG, or WebP · up to 5 MB each · 20 at a time</p>
              </div>
            </div>
            <SelectedImagePreviews files={files} onRemove={(index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {albumImages.map((img) => (
                <div key={img.id} className="group relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(img.image_path)} alt={img.caption || "Gallery photo"} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => setDeleteImageTarget(img)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-900/80 text-xs font-bold text-white opacity-100 transition hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete gallery image">×</button>
                  <button type="button" className="w-full truncate px-2 py-2 text-left text-xs text-slate/60" onClick={() => { const caption = window.prompt("Edit image caption", img.caption ?? ""); if (caption !== null) startTransition(async () => { const result = await updateGalleryImage(img.id, caption); if (result.error) push(result.error, "error"); else push("Image caption updated"); }); }}>{img.caption || "Edit caption"}</button>
                </div>
              ))}
              {albumImages.length === 0 && <p className="col-span-full text-sm text-slate/50">No photos yet.</p>}
            </div>
          </>
        )}
      </Card>
      <Card className="lg:col-span-2">
        <div className="flex items-end justify-between gap-3 border-b border-ink-100 pb-4">
          <div><h2 className="font-display text-lg text-ink-700">All galleries</h2><p className="mt-1 text-sm text-slate/60">Select a gallery to manage photos or edit its details.</p></div>
          <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-slate/60">{albums.length} {albums.length === 1 ? "gallery" : "galleries"}</span>
        </div>
        <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_130px_100px_180px] gap-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate/50 md:grid"><span>Gallery</span><span>Date</span><span>Photos</span><span className="text-right">Actions</span></div>
        <ul className="divide-y divide-ink-100">
          {albums.map((album) => {
            const count = images.filter((image) => image.album_id === album.id).length;
            return <li key={album.id} className={`grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_130px_100px_180px] md:items-center md:px-3 ${album.id === selectedAlbum ? "rounded-lg bg-ink-50/70" : ""}`}>
              <button type="button" onClick={() => setSelectedAlbum(album.id)} className="min-w-0 text-left"><p className="truncate font-semibold text-ink-700">{album.title}</p><p className="mt-1 truncate text-sm text-slate/60">{album.description || "No description added"}</p></button>
              <span className="text-sm text-slate/70">{album.gallery_date || "—"}</span>
              <span className="text-sm text-slate/70">{count} {count === 1 ? "photo" : "photos"}</span>
              <div className="flex justify-end gap-1"><Button type="button" variant="ghost" onClick={() => editAlbum(album)}>Edit</Button><Button type="button" variant="ghost" onClick={() => setDeleteAlbumTarget(album)}>Delete</Button></div>
            </li>;
          })}
          {albums.length === 0 && <li className="py-8 text-center text-sm text-slate/50">Your galleries will appear here.</li>}
        </ul>
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
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<EventImage | null>(null);
  const selectedEventImages = eventImages.filter((image) => image.event_id === selectedEvent);

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

  function startEditEvent(event: EventRow) {
    setEditingEvent(event);
    setForm({ title: event.title, description: event.description, event_date: event.event_date, image_path: event.image_path ?? "" });
  }

  function handleSaveEvent(e: FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    startTransition(async () => {
      const result = await updateEvent(editingEvent.id, form);
      if (result.error) push(result.error, "error");
      else { push("Event details updated"); setEditingEvent(null); setForm({ title: "", description: "", event_date: "", image_path: "" }); }
    });
  }

  function cancelEditEvent() {
    setEditingEvent(null);
    setForm({ title: "", description: "", event_date: "", image_path: "" });
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

  function editEventDetails(event: EventRow) {
    startEditEvent(event);
  }

  function handleDeleteEventImage() {
    if (!deleteImageTarget) return;
    startTransition(async () => {
      const { error } = await deleteEventImage(deleteImageTarget.id);
      setDeleteImageTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push("Event image deleted");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit min-w-0 border-ink-100 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold text-ink-700">{editingEvent ? "Edit event" : "New event"}</h2>{editingEvent && <Button type="button" variant="ghost" onClick={cancelEditEvent}>Cancel</Button>}</div>
        <p className="mt-1 text-sm leading-6 text-slate/60">Create an event, then manage its banner and photo gallery.</p>
        <form onSubmit={editingEvent ? handleSaveEvent : handleCreate} className="mt-4 space-y-4">
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
            <Label htmlFor="e-desc" className="font-semibold text-ink-700">Description</Label>
            <div className="mt-1.5 overflow-hidden rounded-xl border border-gold-300 bg-gold-50/40 shadow-sm transition focus-within:border-gold-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-gold-100">
              <textarea
                id="e-desc"
                rows={5}
                className="block min-h-32 w-full resize-y bg-transparent px-4 py-3 text-[15px] leading-6 text-ink-700 placeholder:text-slate/50 focus:outline-none"
                placeholder="Write a clear description about this event"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
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
            {editingEvent ? "Save event" : "Add event"}
          </Button>
        </form>
      </Card>
      <Card className="min-w-0">
        <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
          <Label htmlFor="event-photo-upload">Event photo gallery</Label>
          <select id="event-photo-upload" className="mt-1 w-full" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="">Choose an event</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title} — {event.event_date}</option>)}
          </select>
          <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div className="min-w-0"><Label htmlFor="event-photo-file-upload">Add event photos</Label><input id="event-photo-file-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!selectedEvent} onChange={(e) => setFiles(Array.from(e.target.files ?? []).filter((image) => PAGE_IMAGE_TYPES.has(image.type) && image.size <= MAX_UPLOAD_SIZE))} className="mt-1.5 block w-full min-w-0 text-sm" /></div><Button type="button" onClick={handleUploadImages} disabled={!selectedEvent || !files.length || pending} className="w-full whitespace-nowrap sm:w-auto">{pending ? "Uploading…" : `Upload ${files.length ? `${files.length} images` : "images"}`}</Button></div><div className="mt-3"><Input placeholder="Caption for these images (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} /></div><p className="mt-2 text-xs text-slate/50">JPG, PNG, or WebP · up to 5 MB each · 20 at a time</p></div>
          <SelectedImagePreviews files={files} onRemove={(index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />
          {selectedEvent && <><p className="mt-4 text-xs font-medium text-ink-700">{selectedEventImages.length} event photos uploaded</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><>{selectedEventImages.map((image) => <div key={image.id} className="group relative overflow-hidden rounded-lg border border-ink-100 bg-white"><img src={mediaUrl(image.image_path)} alt={image.caption || "Event photo"} className="aspect-square w-full object-cover" /><button type="button" onClick={() => setDeleteImageTarget(image)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-900/80 text-xs font-bold text-white opacity-100 transition hover:bg-danger sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete event image">×</button><p className="truncate px-2 py-2 text-xs text-slate/60">{image.caption || "Event photo"}</p></div>)}</></div></>}
        </div>
        <ul className="mt-6 divide-y divide-ink-100 border-t border-ink-100">
          {events.map((e) => (
            <li key={e.id} className={`grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_130px_100px_180px] md:items-center md:px-3 ${e.id === selectedEvent ? "rounded-lg bg-ink-50/70" : ""}`}>
              <button type="button" onClick={() => setSelectedEvent(e.id)} className="min-w-0 text-left"><p className="truncate font-semibold text-ink-700">{e.title}</p><p className="mt-1 truncate text-sm text-slate/60">{e.description || "No description added"}</p></button><span className="text-sm text-slate/70">{e.event_date}</span><span className="text-sm text-slate/70">{eventImages.filter((image) => image.event_id === e.id).length} photos</span>
              <div className="flex gap-1"><Button variant="ghost" onClick={() => editEventDetails(e)}>Edit</Button><Button variant="ghost" onClick={() => setDeleteTarget(e)}>Delete</Button></div>
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
      <ConfirmDialog
        open={!!deleteImageTarget}
        title="Delete event image?"
        description="This photo will be removed from the event gallery."
        onConfirm={handleDeleteEventImage}
        onCancel={() => setDeleteImageTarget(null)}
      />
    </div>
  );
}

function MessagesTab({ messages }: { messages: ContactMessage[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [liveMessages, setLiveMessages] = useState(messages);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  useEffect(() => setLiveMessages(messages), [messages]);
  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
      if (data) setLiveMessages(data as ContactMessage[]);
    };
    const channel = supabase.channel("cms-contact-messages").on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, refresh).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

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
    <div className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="font-display text-xl font-semibold text-ink-700">Contact messages</h2><p className="mt-1 text-sm text-slate/60">Messages update automatically when visitors contact the school.</p></div><div className="flex gap-2"><span className="rounded-full bg-gold-100 px-3 py-1.5 text-xs font-bold text-gold-700">{liveMessages.filter((m) => !m.is_read).length} unread</span><span className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-slate/70">{liveMessages.length} total</span></div></div>
      <ul className="space-y-4">
        {liveMessages.map((m) => (
          <Card key={m.id} className={`min-w-0 border-ink-100 shadow-sm ${!m.is_read ? "border-l-4 border-l-gold-500 bg-gold-50/20" : ""}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-ink-700">
                  {m.name} <span className="font-normal text-slate/50">· {m.email}</span>
                  {m.phone && <span className="font-normal text-slate/50"> · {m.phone}</span>}
                </p>
                <p className="mt-1 break-all text-sm text-slate/70">{m.email}{m.phone && <span> · {m.phone}</span>}</p>
                <p className="mt-2 text-xs font-medium text-slate/50">{new Date(m.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {!m.is_read && <Badge>Unread</Badge>}
                <Button variant="ghost" onClick={() => toggleRead(m)} disabled={pending}>
                  {m.is_read ? "Mark unread" : "Mark read"}
                </Button>
                <Button variant="ghost" onClick={() => setDeleteTarget(m)}>
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50/40 px-4 py-3"><p className="whitespace-pre-line break-words text-[15px] leading-7 text-ink-700">{m.message}</p></div>
          </Card>
        ))}
        {liveMessages.length === 0 && <li className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 py-10 text-center text-sm text-slate/60">No messages yet.</li>}
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
