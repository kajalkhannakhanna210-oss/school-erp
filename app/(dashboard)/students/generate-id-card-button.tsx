"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { generateStudentIdCards } from "./id-cards/actions";

// Small helper to generate Word doc for a single card
function downloadCardAsWord(card: any) {
  const snap = card.snapshot || {};
  const html = `<!doctype html><html><head><meta charset='utf-8'><title>ID Card</title></head><body><h2>${snap.student_name || 'Student'}</h2><p>Admission No: ${snap.admission_number || 'N/A'}</p><p>Class: ${snap.class_name || ''} - ${snap.section_name || ''}</p><p>Roll: ${snap.roll_number || 'N/A'}</p><p>Mobile: ${snap.mobile_number || 'N/A'}</p></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ID_Card_${snap.admission_number || 'student'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface GenerateIdCardButtonProps {
  studentId: string;
  sessionId: string;
  admissionNumber?: string | null;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}

export function GenerateIdCardButton({
  studentId,
  sessionId,
  admissionNumber,
  variant = "outline",
  size = "sm",
  className = "",
}: GenerateIdCardButtonProps) {
  const { push } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(false);
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  if (!admissionNumber) {
    return null;
  }

  async function fetchLatestCard() {
    const res = await fetch(`/api/students/${encodeURIComponent(studentId)}/latest-card?session_id=${encodeURIComponent(sessionId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to fetch card');
    return json.card;
  }

  function openPreviewWithCard(card: any) {
    setPreviewCard(card);
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generateStudentIdCards({ student_ids: [studentId], session_id: sessionId });
      if (res.error) {
        push(res.error, "error");
        return;
      }
      push('ID Card generated. Opening preview...');
      // fetch the created card and open preview
      try {
        const card = await fetchLatestCard();
        openPreviewWithCard(card);
      } catch (e: any) {
        push(String(e?.message || e), 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    // open a new window containing printable content for the previewCard using template sizes
    if (!previewCard) return;
    const snap = previewCard.snapshot || {};
    const tpl = previewCard.template || {};
    const widthMm = Number(tpl.width_mm || 85.6);
    const heightMm = Number(tpl.height_mm || 53.98);
    const widthIn = (widthMm / 25.4).toFixed(3);
    const heightIn = (heightMm / 25.4).toFixed(3);

    const designPath = previewCard?.template?.options?.front_file_path;
    const designImgHtml = designPath ? (designPath.toLowerCase().endsWith('.pdf') ? `<iframe src="/api/id-card-designs/preview?file=${encodeURIComponent(designPath)}" style="width:100%;height:100%;border:none"></iframe>` : `<img src="/api/id-card-designs/preview?file=${encodeURIComponent(designPath)}" style="max-width:100%;height:auto;display:block">`) : '';

    const html = `<!doctype html><html><head><meta charset='utf-8'><title>ID Card</title><style>
      @page { size: ${widthIn}in ${heightIn}in; margin: 0; }
      body { font-family: Arial, sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
      .card { width: ${widthIn}in; height: ${heightIn}in; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; background: white; position: relative; }
      .header { background:#eff6ff; padding:6px; font-weight:700; font-size:12px; color:#1e3a8a; }
      .title { font-size:14px; font-weight:700; margin-top:6px; }
      .field { font-size:11px; color:#334155; margin-bottom:4px; }
      .design-wrapper { position:absolute; inset:8px; display:flex; align-items:center; justify-content:center }
      .design-img { max-width:100%; max-height:100%; object-fit:contain }
    </style></head><body><div class="card">
      <div class="header">ACADEMIC PUBLIC SCHOOL</div>
      <div class="title">${snap.student_name || 'Student'}</div>
      <div class="field"><b>Admission No:</b> ${snap.admission_number || 'N/A'}</div>
      <div class="field"><b>Class / Sec:</b> ${snap.class_name || ''} - ${snap.section_name || ''}</div>
      <div class="field"><b>Roll:</b> ${snap.roll_number || 'N/A'}</div>
      <div class="field"><b>Mobile:</b> ${snap.mobile_number || 'N/A'}</div>
      <div class="design-wrapper">${designImgHtml}</div>
    </div></body></html>`;

    const w = window.open('', '_blank');
    if (!w) return push('Could not open print window', 'error');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  return (
    <>
      <Button
        variant={variant}
        onClick={handleGenerate}
        disabled={isPending || loading}
        className={`inline-flex items-center gap-1.5 ${className}`}
        aria-label={admissionNumber ? `Generate ID card for ${admissionNumber}` : 'Generate ID card'}
      >
        {/* Icon visible only on mobile (small screens) */}
        <span className="inline-flex items-center justify-center md:hidden" aria-hidden="true">🪪</span>
        {/* Text visible on md+ */}
        <span className="hidden md:inline">{loading ? 'Generating...' : 'Generate ID Card'}</span>
      </Button>

      {previewCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewCard(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Identity Card Preview: {previewCard.snapshot?.student_name || 'Student'}</h3>
                <p className="text-xs text-slate-500">Admission No: {previewCard.snapshot?.admission_number || 'N/A'}</p>
              </div>
              <button onClick={() => setPreviewCard(null)} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 text-sm font-bold">✕</button>
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* Responsive card container sized to template dimensions (falls back to sensible defaults) */}
              {(() => {
                const tpl = previewCard.template || {};
                const widthMm = Number(tpl.width_mm || 85.6);
                const heightMm = Number(tpl.height_mm || 53.98);
                const paddingTop = (heightMm / widthMm) * 100;
                return (
                  <div style={{ width: '100%', maxWidth: `${widthMm}mm` }}>
                    <div style={{ width: '100%', paddingTop: `${paddingTop}%`, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0 }} className="rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center gap-3 my-1">
                        {(() => {
                          // If the template provides a front file path, show the design image (image or pdf iframe)
                          const frontPath = previewCard?.template?.options?.front_file_path;
                          if (frontPath) {
                            const ext = String(frontPath).split('.').pop()?.toLowerCase() || '';
                            if (ext === 'pdf') {
                              return (
                                <iframe src={`/api/id-card-designs/preview?file=${encodeURIComponent(frontPath)}`} style={{ width: 56, height: 64, border: 'none' }} title="design-pdf-preview" />
                              );
                            }
                            return (
                              <img src={`/api/id-card-designs/preview?file=${encodeURIComponent(frontPath)}`} alt="ID design" className="w-14 h-16 rounded-md bg-slate-100 border border-slate-300 object-cover" />
                            );
                          }

                          return (
                            <div className="w-14 h-16 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500">👤</div>
                          );
                        })()}

                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate">{previewCard.snapshot?.student_name}</h3>
                          <p className="text-[9px] text-blue-700 font-mono font-medium">Adm No: <span className="text-slate-900 font-bold">{previewCard.snapshot?.admission_number}</span></p>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">📄 Print / Save as PDF</button>
                <button onClick={() => downloadCardAsWord(previewCard)} className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50">📝 Download .doc</button>
                <button onClick={() => { /* future: request server PDF */ }} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">⬇️ Download PDF</button>
                <button onClick={() => setPreviewCard(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
