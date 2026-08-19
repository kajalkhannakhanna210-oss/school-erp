"use client";

import React, { useState } from "react";

export default function DesignUploadPage() {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [name, setName] = useState("");
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [orientation, setOrientation] = useState("portrait");
  const [setDefault, setSetDefault] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload() {
    setMessage(null);
    if (!frontFile && !backFile) return setMessage("Choose at least one file to upload.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("designUpload", "true");
      if (frontFile) fd.append("files", frontFile, frontFile.name);
      if (backFile) fd.append("files", backFile, backFile.name);

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setUploadResult(json);
      setMessage("Upload successful. Review and finalize below.");
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  function getPath(index: number) {
    // server returns designs array in order uploaded
    if (!uploadResult?.designs) return null;
    return uploadResult.designs[index]?.filePath || null;
  }

  async function handleFinalize() {
    setMessage(null);
    if (!uploadResult?.designs?.length) return setMessage("No uploaded designs to finalize.");
    setFinalizing(true);
    try {
      const frontPath = getPath(0);
      const backPath = getPath(1) || null;
      const payload = {
        name: name || "Custom ID Card Template",
        front_file_path: frontPath,
        back_file_path: backPath,
        orientation,
        width_mm: Number(widthMm) || null,
        height_mm: Number(heightMm) || null,
        options: {},
        set_as_default: !!setDefault,
        is_active: true,
      };

      const fd = new FormData();
      fd.append("finalizeDesign", "true");
      fd.append("finalizeData", JSON.stringify(payload));

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Finalize failed");
      setMessage("Template finalized successfully.");
      // Optionally redirect to templates list
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Upload ID Card Design</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Front design</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Back design (optional)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setBackFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div className="mt-4">
        <button disabled={uploading} className="btn btn-primary" onClick={handleUpload}>
          {uploading ? "Uploading..." : "Upload Design"}
        </button>
      </div>

      {uploadResult && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="font-medium">Uploaded files</h2>
          <ul className="mt-2 list-disc pl-6">
            {uploadResult.designs?.map((d: any, i: number) => (
              <li key={i}>{d.originalFileName} — {d.filePath}</li>
            ))}
          </ul>

          <div className="mt-4 grid gap-2">
            <label className="block text-sm">Template name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />

            <div className="flex gap-2 mt-2">
              <div>
                <label className="block text-sm">Width (mm)</label>
                <input type="number" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Height (mm)</label>
                <input type="number" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="block text-sm">Orientation</label>
                <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="input">
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <label className="mt-2 inline-flex items-center">
              <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
              <span className="ml-2">Set as default template</span>
            </label>

            <div className="mt-3">
              <button disabled={finalizing} className="btn btn-success" onClick={handleFinalize}>
                {finalizing ? "Finalizing..." : "Finalize Design"}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <div className="mt-4 text-sm text-gray-700">{message}</div>}

      <div className="mt-6">
        <h3 className="font-medium">Preview</h3>
        <div className="mt-2 border rounded p-4">
          <div className="w-full max-w-[85mm] bg-white shadow-sm">
            <div style={{ width: "100%", paddingTop: `${(heightMm / widthMm) * 100}%`, position: "relative" }}>
              {uploadResult?.designs?.[0] && (
                <iframe
                  src={`/api/id-card-designs/preview?file=${encodeURIComponent(uploadResult.designs[0].filePath)}`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  title="Front preview"
                />
              )}
              {!uploadResult?.designs?.[0] && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Front preview not available</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
