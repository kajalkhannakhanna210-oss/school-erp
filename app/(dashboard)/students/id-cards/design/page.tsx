"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, PointerEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

type FileSlotProps = {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
};

type DynamicFieldKey = "student_name" | "class_section" | "admission_number" | "photo";
type DynamicField = { key: DynamicFieldKey; label: string; x: number; y: number; width: number; height: number };
const DEFAULT_FIELDS: DynamicField[] = [
  { key: "student_name", label: "Student name", x: 50, y: 57, width: 42, height: 8 },
  { key: "class_section", label: "Class / section", x: 50, y: 66, width: 42, height: 7 },
  { key: "admission_number", label: "Admission no.", x: 50, y: 75, width: 42, height: 7 },
  { key: "photo", label: "Photo", x: 22, y: 38, width: 26, height: 26 },
];

function Icon({ name, className = "h-5 w-5" }: { name: "arrow" | "check" | "cloud" | "file" | "image" | "info" | "spark" | "upload"; className?: string }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    cloud: <path d="M7 18a4.5 4.5 0 0 1-.7-8.95A6 6 0 0 1 18 10.5h.5a3.5 3.5 0 0 1 0 7H16m-4-6v8m0 0-3-3m3 3 3-3" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    spark: <path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4z" />,
    upload: <><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></>,
  };
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || file.type === "application/pdf") {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

function FileSlot({ label, hint, file, onChange, required }: FileSlotProps) {
  const [dragging, setDragging] = useState(false);
  const previewUrl = useObjectUrl(file);
  const inputId = `${label.toLowerCase().replace(/\s+/g, "-")}-upload`;

  function accept(next: File | undefined) {
    if (!next) return;
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink-900">{label}</label>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${required ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{required ? "Required" : "Optional"}</span>
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files[0]); }}
        className={`relative flex min-h-[188px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : file ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40"}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={`${label} preview`} className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-xl object-contain" />
        ) : file ? (
          <div className="flex flex-col items-center gap-2 text-emerald-700"><Icon name="file" className="h-9 w-9" /><span className="max-w-[220px] truncate text-xs font-semibold">{file.name}</span><span className="text-[11px] text-emerald-600">Ready to upload</span></div>
        ) : (
          <div className="flex flex-col items-center gap-2"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"><Icon name="cloud" /></span><span className="text-sm font-semibold text-slate-700">Drop your design here</span><span className="text-xs text-slate-400">or <span className="font-semibold text-blue-600">browse files</span></span><span className="mt-2 text-[11px] text-slate-400">{hint}</span></div>
        )}
        <input id={inputId} type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => accept(event.target.files?.[0])} />
      </label>
      {file && <button type="button" onClick={() => onChange(null)} className="mt-2 text-xs font-semibold text-slate-500 hover:text-red-600">Remove file</button>}
    </div>
  );
}

export default function DesignUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingTemplateId = searchParams.get("template_id");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [existingFrontPath, setExistingFrontPath] = useState<string | null>(null);
  const [existingBackPath, setExistingBackPath] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [name, setName] = useState("");
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [setDefault, setSetDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [accentColor, setAccentColor] = useState("#f7c200");
  const [schoolTitle, setSchoolTitle] = useState("ACADEMIC PUBLIC SCHOOL");
  const [fields, setFields] = useState<DynamicField[]>(DEFAULT_FIELDS);
  const [draggingField, setDraggingField] = useState<DynamicFieldKey | null>(null);
  const [selectedField, setSelectedField] = useState<DynamicFieldKey>("student_name");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingTemplateId) return;
    let cancelled = false;
    fetch(`/api/documents/upload?template_id=${encodeURIComponent(editingTemplateId)}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || "Could not load template.");
        if (cancelled) return;
        const template = json.template;
        const options = template.options || {};
        const branding = options.branding || {};
        const savedFields = Array.isArray(options.fields) ? options.fields : null;
        setName(template.name || "");
        setWidthMm(Number(template.width_mm) || 85.6);
        setHeightMm(Number(template.height_mm) || 53.98);
        setOrientation(template.orientation === "landscape" ? "landscape" : "portrait");
        setSetDefault(Boolean(template.is_default));
        setExistingFrontPath(options.front_file_path || null);
        setExistingBackPath(options.back_file_path || null);
        setSchoolTitle(branding.school_title || "ACADEMIC PUBLIC SCHOOL");
        setPrimaryColor(branding.primary_color || "#1d4ed8");
        setAccentColor(branding.accent_color || "#f7c200");
        if (savedFields) setFields(savedFields);
      })
      .catch((error) => {
        if (!cancelled) setMessage({ text: error instanceof Error ? error.message : "Could not load template.", type: "error" });
      });
    return () => { cancelled = true; };
  }, [editingTemplateId]);

  const frontPreview = useObjectUrl(frontFile);
  const backPreview = useObjectUrl(backFile);
  const activeFile = side === "front" ? frontFile : backFile;
  const activePreview = side === "front"
    ? frontPreview || (existingFrontPath ? `/api/id-card-designs/preview?file=${encodeURIComponent(existingFrontPath)}` : null)
    : backPreview || (existingBackPath ? `/api/id-card-designs/preview?file=${encodeURIComponent(existingBackPath)}` : null);
  const activePath = side === "front" ? existingFrontPath : existingBackPath;
  const activeIsPdf = (activeFile?.type === "application/pdf") || Boolean(activePath?.toLowerCase().endsWith(".pdf"));
  const ratio = orientation === "landscape" ? widthMm / heightMm : heightMm / widthMm;
  const fileCount = Number(Boolean(frontFile)) + Number(Boolean(backFile));

  function moveField(key: DynamicFieldKey, event: PointerEvent<HTMLDivElement>) {
    if (!draggingField || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    setFields((current) => current.map((field) => field.key === key ? {
      ...field,
      x: Math.max(0, Math.min(100 - field.width, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100 - field.height, ((event.clientY - rect.top) / rect.height) * 100)),
    } : field));
  }

  function dropField(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const key = event.dataTransfer.getData("application/id-card-field") as DynamicFieldKey;
    const definition = DEFAULT_FIELDS.find((field) => field.key === key);
    if (!definition || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100 - definition.width, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100 - definition.height, ((event.clientY - rect.top) / rect.height) * 100));
    setFields((current) => current.some((field) => field.key === key)
      ? current.map((field) => field.key === key ? { ...field, x, y } : field)
      : [...current, { ...definition, x, y }]);
    setSelectedField(key);
  }

  function validateFile(file: File | null) {
    if (!file) return null;
    if (!ALLOWED_TYPES.includes(file.type)) return "Use a PDF, JPG, PNG, or WebP file.";
    if (file.size > MAX_SIZE) return "Each design must be 10 MB or smaller.";
    return null;
  }

  async function handleUpload() {
    setMessage(null);
    const error = validateFile(frontFile) || validateFile(backFile);
    if (error) return setMessage({ text: error, type: "error" });
    if (!frontFile && !backFile) return setMessage({ text: "Add at least a front design to continue.", type: "error" });
    setUploading(true);
    try {
      const form = new FormData();
      form.append("designUpload", "true");
      if (frontFile) form.append("files", frontFile, frontFile.name);
      if (backFile) form.append("files", backFile, backFile.name);
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Upload failed.");
      setUploadResult(json);
      setMessage({ text: "Design uploaded. Review the preview and publish it.", type: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Upload failed.", type: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function handleFinalize() {
    setMessage(null);
    const frontPath = uploadResult?.designs?.[0]?.filePath || existingFrontPath;
    const backPath = uploadResult?.designs?.[1]?.filePath || existingBackPath;
    if (!frontPath) return setMessage({ text: "Upload a design before publishing.", type: "error" });
    setFinalizing(true);
    try {
      const payload = {
        template_id: editingTemplateId || undefined,
        name: name.trim() || "Custom ID Card Template",
        front_file_path: frontPath,
        back_file_path: backPath || null,
        orientation,
        width_mm: Number(widthMm) || null,
        height_mm: Number(heightMm) || null,
        options: { branding: { school_title: schoolTitle, primary_color: primaryColor, accent_color: accentColor }, fields },
        set_as_default: setDefault,
        is_active: true,
      };
      const form = new FormData();
      form.append("finalizeDesign", "true");
      form.append("finalizeData", JSON.stringify(payload));
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Could not publish template.");
      setMessage({ text: editingTemplateId ? "Template design updated successfully." : "Template published successfully.", type: "success" });
      setTimeout(() => router.push("/students/id-cards"), 900);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not publish template.", type: "error" });
    } finally {
      setFinalizing(false);
    }
  }

  const uploadSummary = useMemo(() => uploadResult?.designs?.map((design: any) => design.originalFileName).join(" and "), [uploadResult]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700"><span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-100"><Icon name="spark" className="h-3.5 w-3.5" /></span> ID CARD STUDIO</div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">{editingTemplateId ? "Edit ID card design" : "Upload ID card design"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{editingTemplateId ? "Update the artwork or branding on this reusable card template." : "Bring your school identity to life. Upload a ready-made design and publish a reusable card template."}</p>
        </div>
        <button type="button" onClick={() => router.push("/students/id-cards")} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-ink-900 sm:self-auto">Cancel</button>
      </div>

      {message && <div role="status" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><Icon name={message.type === "error" ? "info" : "check"} className="h-4 w-4 shrink-0" />{message.text}</div>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-ink-900">Upload your artwork</h2><p className="mt-1 text-xs text-slate-500">Use high-resolution artwork for the best print quality.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{fileCount + Number(Boolean(existingFrontPath)) + Number(Boolean(existingBackPath))}/2 added</span></div>
            <div className="grid gap-5 md:grid-cols-2">
              <FileSlot label="Front design" hint="PDF, JPG, PNG or WebP · Max 10 MB" file={frontFile} onChange={setFrontFile} required />
              <FileSlot label="Back design" hint="PDF, JPG, PNG or WebP · Max 10 MB" file={backFile} onChange={setBackFile} />
            </div>
            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-blue-50/70 p-3.5 text-xs text-blue-800 sm:flex-row sm:items-center"><Icon name="info" className="h-4 w-4 shrink-0 text-blue-600" /><span>Leave the back blank if your card is single-sided. You can switch sides in the preview.</span></div>
            <button type="button" disabled={uploading} onClick={handleUpload} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"><Icon name="upload" className="h-4 w-4" />{uploading ? "Uploading design..." : uploadResult ? "Upload new design" : "Upload design"}<Icon name="arrow" className="h-4 w-4" /></button>
            {uploadSummary && <p className="mt-3 text-xs text-emerald-600"><span className="font-semibold">Uploaded:</span> {uploadSummary}</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5"><h2 className="text-lg font-bold text-ink-900">Template details</h2><p className="mt-1 text-xs text-slate-500">These details help your team identify this design later.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Template name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2026–27 Student Card" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Card width <span className="font-normal text-slate-400">(mm)</span></span><input type="number" min="1" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Card height <span className="font-normal text-slate-400">(mm)</span></span><input type="number" min="1" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></label>
              <div className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Orientation</span><div className="grid grid-cols-2 gap-3">{(["portrait", "landscape"] as const).map((value) => <button type="button" key={value} onClick={() => setOrientation(value)} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold capitalize transition ${orientation === value ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/10" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"}`}>{value}<span className="mt-1 block text-[11px] font-normal text-slate-400">{value === "portrait" ? "Vertical card" : "Horizontal card"}</span></button>)}</div></div>
              <label className="flex cursor-pointer items-center gap-3 sm:col-span-2"><input type="checkbox" checked={setDefault} onChange={(event) => setSetDefault(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-semibold text-slate-700">Make this the default template <span className="block text-xs font-normal text-slate-400">New ID cards will use this design automatically.</span></span></label>
            </div>
          </div>
        </section>

        <aside className="xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-ink-900">Live preview</h2><p className="text-xs text-slate-400">Approx. {widthMm} × {heightMm} mm</p></div><div className="flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setSide("front")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${side === "front" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Front</button><button type="button" disabled={!backFile && !existingBackPath} onClick={() => setSide("back")} className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${side === "back" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Back</button></div></div>
            <div className="bg-slate-50/80 p-8"><div ref={previewRef} onPointerMove={(event) => draggingField && moveField(draggingField, event)} onPointerUp={() => setDraggingField(null)} onDragOver={(event) => event.preventDefault()} onDrop={dropField} className="relative mx-auto max-w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" style={{ aspectRatio: `${ratio}` }}><div className="absolute inset-x-0 top-0 z-10 h-1.5" style={{ backgroundColor: accentColor }} />{activePreview && activeIsPdf ? <iframe src={activePreview} title={`${side} PDF card design preview`} className="absolute inset-0 h-full w-full border-0" /> : activePreview ? <img src={activePreview} alt={`${side} card design preview`} className="absolute inset-0 h-full w-full object-contain" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="image" className="h-7 w-7" /></div><div><p className="text-sm font-bold" style={{ color: primaryColor }}>{schoolTitle}</p><p className="mt-1 text-xs text-slate-400">Your card preview appears here</p></div></div>}{side === "front" && fields.map((field) => <div key={field.key} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedField(field.key); setDraggingField(field.key); }} onPointerUp={() => setDraggingField(null)} className={`absolute z-20 cursor-move touch-none rounded border border-dashed border-blue-500 bg-white/80 px-1 text-[8px] font-semibold text-blue-800 shadow-sm ${selectedField === field.key ? "ring-2 ring-blue-300" : ""}`} style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%` }}>{field.key === "student_name" ? "Anjali Sharma" : field.key === "class_section" ? "Class II - A" : field.key === "admission_number" ? "ADM-2026-0002" : "PHOTO"}</div>)}</div><p className="mt-3 text-center text-[11px] text-slate-500">Drag the blue field markers to place dynamic student data, then save the design.</p></div>
            <div className="border-t border-slate-100 p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dynamic controls</h3><button type="button" onClick={() => setFields(DEFAULT_FIELDS)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">Reset layout</button></div><p className="mb-3 text-[11px] leading-4 text-slate-400">Drag the blue controls on the card to place live student data. Hidden controls will not be printed.</p><div className="space-y-2">{DEFAULT_FIELDS.map((definition) => { const enabled = fields.some((field) => field.key === definition.key); return             <button key={definition.key} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("application/id-card-field", definition.key); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => { setSelectedField(definition.key); setFields((current) => enabled ? current.filter((field) => field.key !== definition.key) : [...current, definition]); }} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${selectedField === definition.key ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><span>{definition.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{enabled ? "On" : "Off"}</span></button>; })}</div></div><div className="border-t border-slate-100 p-5"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Quick branding</h3><div className="space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">School name</span><input value={schoolTitle} onChange={(event) => setSchoolTitle(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" /></label><div className="flex gap-4"><label className="flex flex-1 items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span className="text-xs font-semibold text-slate-600">Primary</span><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 p-0" /></label><label className="flex flex-1 items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span className="text-xs font-semibold text-slate-600">Accent</span><input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 p-0" /></label></div></div></div>
            <div className="border-t border-slate-100 p-5"><button type="button" disabled={finalizing || (!uploadResult && !existingFrontPath)} onClick={handleFinalize} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">{finalizing ? "Saving changes..." : editingTemplateId ? "Save design changes" : "Publish template"}<Icon name="arrow" className="h-4 w-4" /></button>{!uploadResult && !existingFrontPath && <p className="mt-2 text-center text-[11px] text-slate-400">Upload your artwork to enable publishing.</p>}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
