"use client";

import React, { useState, useMemo } from "react";

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

  // margins and bleed
  const [useSameMargin, setUseSameMargin] = useState(true);
  const [marginTop, setMarginTop] = useState(3);
  const [marginRight, setMarginRight] = useState(3);
  const [marginBottom, setMarginBottom] = useState(3);
  const [marginLeft, setMarginLeft] = useState(3);
  const [bleedEnabled, setBleedEnabled] = useState(false);
  const [bleedTop, setBleedTop] = useState(2);
  const [bleedRight, setBleedRight] = useState(2);
  const [bleedBottom, setBleedBottom] = useState(2);
  const [bleedLeft, setBleedLeft] = useState(2);
  const [showSafeArea, setShowSafeArea] = useState(true);

  // When useSameMargin changes, sync others
  function handleSameMarginToggle(checked: boolean) {
    setUseSameMargin(checked);
    if (checked) {
      setMarginRight(marginTop);
      setMarginBottom(marginTop);
      setMarginLeft(marginTop);
    }
  }

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
        options: {
          margins: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft, unit: "mm" },
          bleed: bleedEnabled ? { top: bleedTop, right: bleedRight, bottom: bleedBottom, left: bleedLeft, unit: "mm" } : null,
          safe_area: showSafeArea,
        },
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
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      setFinalizing(false);
    }
  }

  // preview helper: compute CSS percentages for margins/bleed
  const previewMetrics = useMemo(() => {
    const w = Number(widthMm) || 1;
    const h = Number(heightMm) || 1;
    const mt = Number(marginTop) || 0;
    const mr = Number(marginRight) || 0;
    const mb = Number(marginBottom) || 0;
    const ml = Number(marginLeft) || 0;
    const bt = bleedEnabled ? Number(bleedTop) || 0 : 0;
    const br = bleedEnabled ? Number(bleedRight) || 0 : 0;
    const bb = bleedEnabled ? Number(bleedBottom) || 0 : 0;
    const bl = bleedEnabled ? Number(bleedLeft) || 0 : 0;
    return {
      leftPercent: (ml / w) * 100,
      rightPercent: (mr / w) * 100,
      topPercent: (mt / h) * 100,
      bottomPercent: (mb / h) * 100,
      bleedLeftPercent: (bl / w) * 100,
      bleedRightPercent: (br / w) * 100,
      bleedTopPercent: (bt / h) * 100,
      bleedBottomPercent: (bb / h) * 100,
    };
  }, [widthMm, heightMm, marginTop, marginRight, marginBottom, marginLeft, bleedTop, bleedRight, bleedBottom, bleedLeft, bleedEnabled]);

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

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Margins (mm)</label>
                <div className="flex gap-2 mt-2">
                  <div>
                    <label className="text-xs">Top</label>
                    <input type="number" value={marginTop} onChange={(e) => { setMarginTop(Number(e.target.value)); if (useSameMargin) { setMarginRight(Number(e.target.value)); setMarginBottom(Number(e.target.value)); setMarginLeft(Number(e.target.value)); } }} className="input w-20" />
                  </div>
                  <div>
                    <label className="text-xs">Right</label>
                    <input type="number" value={marginRight} onChange={(e) => setMarginRight(Number(e.target.value))} className="input w-20" />
                  </div>
                  <div>
                    <label className="text-xs">Bottom</label>
                    <input type="number" value={marginBottom} onChange={(e) => setMarginBottom(Number(e.target.value))} className="input w-20" />
                  </div>
                  <div>
                    <label className="text-xs">Left</label>
                    <input type="number" value={marginLeft} onChange={(e) => setMarginLeft(Number(e.target.value))} className="input w-20" />
                  </div>
                </div>
                <label className="inline-flex items-center mt-2">
                  <input type="checkbox" checked={useSameMargin} onChange={(e) => handleSameMarginToggle(e.target.checked)} />
                  <span className="ml-2 text-sm">Use same margin</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium">Bleed (mm)</label>
                <label className="inline-flex items-center mt-2">
                  <input type="checkbox" checked={bleedEnabled} onChange={(e) => setBleedEnabled(e.target.checked)} />
                  <span className="ml-2 text-sm">Enable bleed</span>
                </label>

                {bleedEnabled && (
                  <div className="flex gap-2 mt-2">
                    <div>
                      <label className="text-xs">Top</label>
                      <input type="number" value={bleedTop} onChange={(e) => setBleedTop(Number(e.target.value))} className="input w-20" />
                    </div>
                    <div>
                      <label className="text-xs">Right</label>
                      <input type="number" value={bleedRight} onChange={(e) => setBleedRight(Number(e.target.value))} className="input w-20" />
                    </div>
                    <div>
                      <label className="text-xs">Bottom</label>
                      <input type="number" value={bleedBottom} onChange={(e) => setBleedBottom(Number(e.target.value))} className="input w-20" />
                    </div>
                    <div>
                      <label className="text-xs">Left</label>
                      <input type="number" value={bleedLeft} onChange={(e) => setBleedLeft(Number(e.target.value))} className="input w-20" />
                    </div>
                  </div>
                )}

                <label className="inline-flex items-center mt-2">
                  <input type="checkbox" checked={showSafeArea} onChange={(e) => setShowSafeArea(e.target.checked)} />
                  <span className="ml-2 text-sm">Show safe area</span>
                </label>
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
