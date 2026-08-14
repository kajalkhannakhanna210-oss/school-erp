"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { DocumentCategory } from "@/lib/documents";
import type { DocumentSubjectType } from "@/lib/security/documents";
import { saveDocumentCategory, saveDocumentSettings } from "@/app/(dashboard)/documents/actions";

const fileTypes = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];

export function DocumentConfiguration({ categories, maxFileSizeBytes, allowedFileTypes, expiryReminderDays }: {
  categories: DocumentCategory[];
  maxFileSizeBytes: number;
  allowedFileTypes: string[];
  expiryReminderDays: number;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [newCategory, setNewCategory] = useState({ subjectType: "student" as DocumentSubjectType, code: "", name: "", isSensitive: false, isRequired: false, subjectVisible: false });
  const [settings, setSettings] = useState({ maxFileSizeMb: Math.round(maxFileSizeBytes / (1024 * 1024)), allowedFileTypes, expiryReminderDays });

  function updateCategory(category: DocumentCategory, patch: Partial<DocumentCategory>) {
    const next = { ...category, ...patch };
    startTransition(async () => {
      const result = await saveDocumentCategory({
        id: next.id, subjectType: next.subject_type, code: next.code, name: next.name,
        isActive: next.is_active, isRequired: next.is_required, isSensitive: next.is_sensitive, subjectVisible: next.subject_visible,
      });
      push(result.error ?? `${next.name} updated.`, result.error ? "error" : "success");
    });
  }

  function createCategory() {
    startTransition(async () => {
      const result = await saveDocumentCategory({
        subjectType: newCategory.subjectType, code: newCategory.code.trim(), name: newCategory.name,
        isActive: true, isRequired: newCategory.isRequired, isSensitive: newCategory.isSensitive, subjectVisible: newCategory.subjectVisible,
      });
      if (result.error) return push(result.error, "error");
      push("Document category created.");
      setNewCategory({ subjectType: newCategory.subjectType, code: "", name: "", isSensitive: false, isRequired: false, subjectVisible: false });
    });
  }

  function saveSettings() {
    startTransition(async () => {
      const result = await saveDocumentSettings(settings);
      push(result.error ?? "Document settings updated.", result.error ? "error" : "success");
    });
  }

  return (
    <div className="space-y-6">
      <section><h3 className="font-semibold text-ink-700">Categories</h3><p className="mt-1 text-sm text-slate/60">Required and self-service settings are applied immediately. A self-service category is only visible to its own approved subject, never to other users.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-ink-50 text-xs uppercase tracking-wide text-slate/60"><tr><th className="px-3 py-3">Category</th><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Active</th><th className="px-3 py-3">Required</th><th className="px-3 py-3">Sensitive</th><th className="px-3 py-3">Self-service</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id} className="border-t border-ink-100"><td className="px-3 py-3"><p className="font-semibold text-ink-700">{category.name}</p><p className="font-mono text-xs text-slate/50">{category.code}</p></td><td className="px-3 py-3 capitalize">{category.subject_type}</td>{([
          ["is_active", "Active"], ["is_required", "Required"], ["is_sensitive", "Sensitive"], ["subject_visible", "Self-service"],
        ] as const).map(([field, label]) => <td className="px-3 py-3" key={field}><label className="inline-flex cursor-pointer items-center gap-2"><input aria-label={`${label}: ${category.name}`} disabled={pending} type="checkbox" checked={category[field]} onChange={() => updateCategory(category, { [field]: !category[field] })} /><span className="text-xs text-slate/60">{category[field] ? "Yes" : "No"}</span></label></td>)}</tr>)}</tbody></table></div>
      </section>

      <section className="rounded-xl border border-ink-100 bg-ink-50/40 p-4"><h3 className="font-semibold text-ink-700">Add a category</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><Label>Subject</Label><select className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-100 bg-white px-3 text-sm" value={newCategory.subjectType} onChange={(event) => setNewCategory({ ...newCategory, subjectType: event.target.value as DocumentSubjectType })}><option value="student">Student</option><option value="staff">Staff</option></select></div><div><Label>Code</Label><Input value={newCategory.code} onChange={(event) => setNewCategory({ ...newCategory, code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="income_certificate" /></div><div className="sm:col-span-2"><Label>Name</Label><Input value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} placeholder="Income Certificate" /></div></div><div className="mt-3 flex flex-wrap gap-4 text-sm"><label><input className="mr-2" type="checkbox" checked={newCategory.isRequired} onChange={(event) => setNewCategory({ ...newCategory, isRequired: event.target.checked })} />Required</label><label><input className="mr-2" type="checkbox" checked={newCategory.isSensitive} onChange={(event) => setNewCategory({ ...newCategory, isSensitive: event.target.checked })} />Sensitive</label><label><input className="mr-2" type="checkbox" checked={newCategory.subjectVisible} onChange={(event) => setNewCategory({ ...newCategory, subjectVisible: event.target.checked })} />Visible in self-service</label></div><Button className="mt-4" disabled={pending || !newCategory.code || !newCategory.name.trim()} onClick={createCategory}>Add category</Button></section>

      <section className="rounded-xl border border-ink-100 bg-ink-50/40 p-4"><h3 className="font-semibold text-ink-700">Upload and expiry settings</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Maximum file size (MB)</Label><Input type="number" min="1" max="10" value={settings.maxFileSizeMb} onChange={(event) => setSettings({ ...settings, maxFileSizeMb: Number(event.target.value) })} /></div><div><Label>Expiry reminder (days)</Label><Input type="number" min="1" max="365" value={settings.expiryReminderDays} onChange={(event) => setSettings({ ...settings, expiryReminderDays: Number(event.target.value) })} /></div></div><fieldset className="mt-4"><legend className="text-xs font-semibold uppercase tracking-wider text-slate/70">Allowed file types</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">{fileTypes.map((fileType) => <label key={fileType}><input className="mr-2" type="checkbox" checked={settings.allowedFileTypes.includes(fileType)} onChange={(event) => setSettings({ ...settings, allowedFileTypes: event.target.checked ? [...settings.allowedFileTypes, fileType] : settings.allowedFileTypes.filter((item) => item !== fileType) })} />.{fileType}</label>)}</div></fieldset><Button className="mt-4" disabled={pending} onClick={saveSettings}>Save settings</Button></section>
    </div>
  );
}
