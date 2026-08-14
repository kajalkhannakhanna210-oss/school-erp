"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import type { DocumentActivityRow, DocumentCategory, DocumentPanelRow } from "@/lib/documents";
import type { DocumentStatus, DocumentSubjectType } from "@/lib/security/documents";

const statuses: DocumentStatus[] = ["active", "pending_review", "approved", "rejected", "expired", "archived"];
const rowsPerPage = 10;

function labelForStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFileSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

function extensionFromMime(value: string) {
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return value.replace("image/", "").toUpperCase();
  if (value.includes("word")) return "DOCX";
  if (value.includes("excel") || value.includes("spreadsheet")) return "XLSX";
  return value || "—";
}

type EditState = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  status: DocumentStatus;
  expiryDate: string;
};

export function DocumentPanel({
  subjectType,
  subjectId,
  documents,
  categories,
  canManage,
  canDelete,
  canViewAudit,
  activityByDocument = {},
}: {
  subjectType: DocumentSubjectType;
  subjectId: string;
  documents: DocumentPanelRow[];
  categories: DocumentCategory[];
  canManage: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  activityByDocument?: Record<string, DocumentActivityRow[]>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const replacementInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [replacementTarget, setReplacementTarget] = useState<DocumentPanelRow | null>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories.find((category) => category.is_active)?.id ?? "");
  const [status, setStatus] = useState<DocumentStatus>("pending_review");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirm, setConfirm] = useState<{ action: "archive" | "delete"; document: DocumentPanelRow } | null>(null);

  const visibleDocuments = useMemo(() => {
    const filtered = documents.filter((document) => {
      const search = query.trim().toLowerCase();
      const searchable = `${document.title} ${document.originalFileName} ${document.category?.name ?? ""}`.toLowerCase();
      return (!search || searchable.includes(search)) && (statusFilter === "all" || document.effectiveStatus === statusFilter);
    });
    return filtered.sort((left, right) => {
      if (sort === "oldest") return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (sort === "name") return left.title.localeCompare(right.title);
      if (sort === "category") return (left.category?.name ?? "").localeCompare(right.category?.name ?? "");
      if (sort === "expiry") return (left.expiryDate ?? "9999-12-31").localeCompare(right.expiryDate ?? "9999-12-31");
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [documents, query, statusFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const currentDocuments = visibleDocuments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const requiredCategories = categories.filter((category) => category.is_required && category.is_active);
  const submittedRequiredCategories = requiredCategories.filter((category) => documents.some((document) => (
    document.categoryId === category.id && !["archived", "rejected", "expired"].includes(document.effectiveStatus)
  )));

  function selectFiles(nextFiles: FileList | File[] | null) {
    const selected = nextFiles ? Array.from(nextFiles).slice(0, 5) : [];
    setFiles(selected);
  }

  async function upload(nextFiles: File[], supersedesDocumentId?: string) {
    if (!nextFiles.length || !categoryId || uploading) return;
    setUploading(true);
    setProgress(0);
    const form = new FormData();
    form.set("subjectType", subjectType);
    form.set("subjectId", subjectId);
    form.set("categoryId", categoryId);
    form.set("title", title);
    form.set("description", description);
    form.set("status", status);
    form.set("expiryDate", expiryDate);
    if (supersedesDocumentId) form.set("supersedesDocumentId", supersedesDocumentId);
    nextFiles.forEach((file) => form.append("files", file));

    await new Promise<void>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/documents/upload");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        const result = (() => { try { return JSON.parse(request.responseText) as { error?: string }; } catch { return {}; } })();
        if (request.status >= 200 && request.status < 300) {
          push(supersedesDocumentId ? "Document replaced and previous version archived." : "Document uploaded.");
          setFiles([]); setTitle(""); setDescription(""); setExpiryDate(""); setStatus("pending_review"); setReplacementTarget(null);
          router.refresh();
        } else {
          push(result.error ?? "The document could not be uploaded.", "error");
        }
        resolve();
      };
      request.onerror = () => { push("The upload could not be completed.", "error"); resolve(); };
      request.send(form);
    });
    setUploading(false);
  }

  function beginEdit(document: DocumentPanelRow) {
    setEdit({
      id: document.id,
      title: document.title,
      description: document.description ?? "",
      categoryId: document.categoryId,
      status: document.status,
      expiryDate: document.expiryDate ?? "",
    });
  }

  async function saveEdit() {
    if (!edit) return;
    const response = await fetch(`/api/documents/${subjectType}/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return push(result.error ?? "The document could not be updated.", "error");
    push("Document details updated."); setEdit(null); router.refresh();
  }

  async function runDestructiveAction() {
    if (!confirm) return;
    const { action, document } = confirm;
    const response = action === "archive"
      ? await fetch(`/api/documents/${subjectType}/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "archived" }) })
      : await fetch(`/api/documents/${subjectType}/${document.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setConfirm(null);
    if (!response.ok) return push(result.error ?? "The document could not be changed.", "error");
    push(action === "archive" ? "Document archived." : "Document deleted.");
    router.refresh();
  }

  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 sm:p-5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFiles(event.dataTransfer.files); }}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div><h3 className="font-semibold text-ink-700">Upload documents</h3><p className="mt-1 text-sm text-slate/60">Drop up to five files here or browse. PDF, images, Word, and Excel files are validated on the server.</p></div>
            <Button variant="ghost" type="button" onClick={() => fileInput.current?.click()}>Browse files</Button>
          </div>
          <input ref={fileInput} className="sr-only" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => selectFiles(event.target.files)} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Category</Label><select className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_sensitive ? " • Sensitive" : ""}</option>)}</select></div>
            <div><Label>Title (optional)</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Uses file name if blank" /></div>
            <div><Label>Status</Label><select className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus)}>{statuses.filter((value) => value !== "expired").map((value) => <option key={value} value={value}>{labelForStatus(value)}</option>)}</select></div>
            <div><Label>Expiry date</Label><Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></div>
          </div>
          <div className="mt-3"><Label>Notes</Label><Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Optional internal note" /></div>
          {selectedCategory?.is_sensitive && <p className="mt-3 text-xs font-medium text-amber-700">This is a sensitive category. Only staff with sensitive-document permission can access it.</p>}
          {files.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate/70">{files.map((file) => <span className="rounded-full bg-white px-3 py-1 shadow-sm" key={`${file.name}-${file.lastModified}`}>{file.name} ({formatFileSize(file.size)})</span>)}</div>}
          {uploading && <div className="mt-4"><div className="h-2 overflow-hidden rounded bg-ink-100"><div className="h-full bg-gold-500 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate/60">Uploading {progress}%</p></div>}
          <Button className="mt-4" disabled={!files.length || !categoryId || uploading} onClick={() => void upload(files)}>{uploading ? "Uploading…" : "Upload documents"}</Button>
        </div>
      )}

      {requiredCategories.length > 0 && (
        <section className="rounded-xl border border-ink-100 bg-ink-50/45 p-4" aria-labelledby="document-checklist-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div><h3 id="document-checklist-heading" className="font-semibold text-ink-700">Required document checklist</h3><p className="mt-1 text-sm text-slate/60">{submittedRequiredCategories.length} of {requiredCategories.length} required categories have a current file.</p></div>
            <span className="font-mono text-sm font-semibold text-ink-700">{Math.round((submittedRequiredCategories.length / requiredCategories.length) * 100)}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${(submittedRequiredCategories.length / requiredCategories.length) * 100}%` }} /></div>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">{requiredCategories.map((category) => {
            const isSubmitted = submittedRequiredCategories.some((item) => item.id === category.id);
            return <li key={category.id} className={`rounded-full px-2.5 py-1 ${isSubmitted ? "bg-success/10 text-success" : "bg-white text-slate/60"}`}>{isSubmitted ? "✓ " : ""}{category.name}</li>;
          })}</ul>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-3 sm:flex-row sm:items-end">
        <div className="flex-1"><Label>Search</Label><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Document name or category" /></div>
        <div><Label>Status</Label><select className="mt-1.5 min-h-11 rounded-lg border border-ink-100 bg-white px-3 text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{labelForStatus(value)}</option>)}</select></div>
        <div><Label>Sort</Label><select className="mt-1.5 min-h-11 rounded-lg border border-ink-100 bg-white px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Document name</option><option value="expiry">Expiry date</option><option value="category">Category</option></select></div>
        <Button variant="ghost" onClick={() => { setQuery(""); setStatusFilter("all"); setSort("newest"); setPage(1); }}>Clear filters</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full min-w-[930px] text-left text-sm"><thead className="bg-ink-50 text-xs uppercase tracking-wide text-slate/60"><tr><th className="px-4 py-3">Document name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Type / size</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Uploaded by</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{currentDocuments.map((document) => <tr key={document.id} className="border-t border-ink-100 align-top"><td className="px-4 py-3"><p className="font-semibold text-ink-700">{document.title}</p><p className="mt-1 max-w-56 truncate text-xs text-slate/60" title={document.originalFileName}>{document.originalFileName}</p>{document.version > 1 && <p className="mt-1 text-xs text-gold-700">Version {document.version}</p>}</td><td className="px-4 py-3">{document.category?.name ?? "—"}</td><td className="px-4 py-3">{extensionFromMime(document.fileType)}<br /><span className="text-xs text-slate/60">{formatFileSize(document.fileSizeBytes)}</span></td><td className="px-4 py-3"><Badge className={document.effectiveStatus === "expired" || document.effectiveStatus === "rejected" ? "bg-danger/10 text-danger" : document.effectiveStatus === "approved" ? "bg-success/10 text-success" : ""}>{labelForStatus(document.effectiveStatus)}</Badge></td><td className="px-4 py-3 whitespace-nowrap">{formatDate(document.uploadedAt)}</td><td className="px-4 py-3">{document.uploadedByName ?? "System / legacy"}</td><td className="px-4 py-3 whitespace-nowrap">{formatDate(document.expiryDate)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><a className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" href={`/api/documents/${subjectType}/${document.id}/content`} target="_blank" rel="noreferrer">{document.fileType === "application/pdf" || document.fileType.startsWith("image/") ? "Preview" : "View"}</a><a className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" href={`/api/documents/${subjectType}/${document.id}/content?download=1`}>Download</a>{canManage && <><button className="min-h-9 rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" onClick={() => beginEdit(document)}>Edit</button><button className="min-h-9 rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" onClick={() => { setReplacementTarget(document); setCategoryId(document.categoryId); replacementInput.current?.click(); }}>Replace</button><button className="min-h-9 rounded-md px-2 text-xs font-semibold text-ink-700 hover:bg-ink-50" onClick={() => setConfirm({ action: "archive", document })}>Archive</button></>}{canDelete && <button className="min-h-9 rounded-md px-2 text-xs font-semibold text-danger hover:bg-danger/5" onClick={() => setConfirm({ action: "delete", document })}>Delete</button>}</div>{canViewAudit && activityByDocument[document.id]?.length ? <details className="mt-2 text-xs text-slate/60"><summary className="cursor-pointer font-semibold">Version & activity</summary><ul className="mt-1 space-y-1">{activityByDocument[document.id].slice(0, 5).map((activity) => <li key={activity.id}>{labelForStatus(activity.action)} · {activity.performedByName ?? "System"} · {formatDate(activity.createdAt)}</li>)}</ul></details> : null}</td></tr>)}{!currentDocuments.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate/60">No documents match the current filters.</td></tr>}</tbody></table>
      </div>
      {totalPages > 1 && <div className="flex items-center justify-center gap-2 text-sm"><Button variant="ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {totalPages}</span><Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button></div>}

      <input ref={replacementInput} className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => { const selected = event.target.files?.[0]; if (selected && replacementTarget) void upload([selected], replacementTarget.id); event.currentTarget.value = ""; }} />
      {edit && <div className="rounded-xl border border-gold-200 bg-gold-50/40 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-ink-700">Edit document details</h3><button className="text-sm text-slate/60" onClick={() => setEdit(null)}>Cancel</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Title</Label><Input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} /></div><div><Label>Category</Label><select className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm" value={edit.categoryId} onChange={(event) => setEdit({ ...edit, categoryId: event.target.value })}>{categories.filter((category) => category.is_active).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div><div><Label>Status</Label><select className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm" value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as DocumentStatus })}>{statuses.map((value) => <option value={value} key={value}>{labelForStatus(value)}</option>)}</select></div><div><Label>Expiry date</Label><Input type="date" value={edit.expiryDate} onChange={(event) => setEdit({ ...edit, expiryDate: event.target.value })} /></div></div><div className="mt-3"><Label>Notes</Label><Input value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></div><Button className="mt-4" onClick={() => void saveEdit()}>Save details</Button></div>}
      <ConfirmDialog open={!!confirm} title={confirm?.action === "delete" ? "Delete document?" : "Archive document?"} description={confirm?.action === "delete" ? "This permanently removes the stored file and its document record. Audit history is retained." : "The document will remain in version history but no longer be active."} confirmLabel={confirm?.action === "delete" ? "Delete" : "Archive"} onConfirm={() => void runDestructiveAction()} onCancel={() => setConfirm(null)} />
    </div>
  );
}
