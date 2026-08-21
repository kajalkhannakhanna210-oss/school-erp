"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  archiveStudentIdCardTemplate,
  generateStudentIdCards,
  updateCardStatus,
  updateStudentIdCardTemplate,
} from "./actions";

interface StudentIdCardViewProps {
  cards: any[];
  studentsWithoutCards: any[];
  academicSessions: any[];
  classes: any[];
  sections: any[];
  templates: any[];
  currentSessionId: string;
  filters: {
    sessionId: string;
    classId: string;
    sectionId: string;
    status: string;
    search: string;
  };
}

export function StudentIdCardView({
  cards,
  studentsWithoutCards,
  academicSessions,
  classes,
  sections,
  templates,
  currentSessionId,
  filters,
}: StudentIdCardViewProps) {
  const router = RouterHook();
  const searchParams = SearchParamsHook();

  const [activeTab, setActiveTab] = useState<"generated" | "generate_new" | "templates">("generated");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedStudentsToGenerate, setSelectedStudentsToGenerate] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    templates.find((template) => template.is_default)?.id || templates[0]?.id || ""
  );
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateDefault, setEditingTemplateDefault] = useState(false);
  const defaultTemplateId = templates.find((template) => template.is_default)?.id || templates[0]?.id || "";

  useEffect(() => {
    if (!selectedTemplate || !templates.some((template) => template.id === selectedTemplate)) {
      setSelectedTemplate(defaultTemplateId);
    }
  }, [defaultTemplateId, selectedTemplate, templates]);

  // Print state
  const [printMode, setPrintMode] = useState<boolean>(false);
  // Preview Modal state
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  // UI loading states for buttons/actions
  const [loadingButtons, setLoadingButtons] = useState<Record<string, boolean>>({});

  function setLoading(key: string, value: boolean) {
    setLoadingButtons((prev) => ({ ...prev, [key]: value }));
  }

  // Controls visibility of filters (must be declared before any early returns)
  const [showFilters, setShowFilters] = useState<boolean>(false);

  function updateFilterParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/students/id-cards?${params.toString()}`);
  }

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  function beginTemplateEdit(template: any) {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name || "");
    setEditingTemplateDefault(Boolean(template.is_default));
  }

  function saveTemplateEdit() {
    if (!editingTemplateId) return;
    setLoading("template-edit", true);
    startTransition(async () => {
      try {
        const result = await updateStudentIdCardTemplate({
          id: editingTemplateId,
          name: editingTemplateName,
          is_default: editingTemplateDefault,
        });
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast("Template updated.");
          setEditingTemplateId(null);
          router.refresh();
        }
      } finally {
        setLoading("template-edit", false);
      }
    });
  }

  function archiveTemplate(id: string) {
    if (!window.confirm("Archive this template? Existing cards will keep using it, but it will no longer be available for new cards.")) return;
    setLoading(`template-archive-${id}`, true);
    startTransition(async () => {
      try {
        const result = await archiveStudentIdCardTemplate(id);
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast("Template archived.");
          router.refresh();
        }
      } finally {
        setLoading(`template-archive-${id}`, false);
      }
    });
  }

  const handleSelectAllCards = (checked: boolean) => {
    if (checked) {
      setSelectedCards(cards.map((c) => c.id));
    } else {
      setSelectedCards([]);
    }
  };

  const handleSelectCard = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudentsToGenerate = (checked: boolean) => {
    if (checked) {
      setSelectedStudentsToGenerate(studentsWithoutCards.map((s) => s.id));
    } else {
      setSelectedStudentsToGenerate([]);
    }
  };

  const handleSelectStudentToGenerate = (id: string) => {
    setSelectedStudentsToGenerate((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerateCards = (studentIds: string[]) => {
    if (!studentIds.length) {
      showToast("Please select at least one student to generate an ID card.", "error");
      return;
    }

    setLoading('generate', true);
    startTransition(async () => {
      try {
        const res = await generateStudentIdCards({
          student_ids: studentIds,
          session_id: filters.sessionId || currentSessionId,
          template_id: selectedTemplate || undefined,
        });

        if (res.error) {
          showToast(res.error, "error");
        } else {
          showToast(`Successfully generated ${res.count} student ID card(s).`);
          setSelectedStudentsToGenerate([]);
          router.refresh();
        }
      } finally {
        setLoading('generate', false);
      }
    });
  };

  const handleUpdateStatus = (status: "printed" | "cancelled" | "expired" | "lost" | "damaged") => {
    if (!selectedCards.length) {
      showToast("Please select at least one card.", "error");
      return;
    }
    setLoading(`updateStatus-${status}`, true);
    startTransition(async () => {
      try {
        const res = await updateCardStatus(selectedCards, status);
        if (res.error) {
          showToast(res.error, "error");
        } else {
          showToast(`Updated ${res.count} card(s) status to '${status}'.`);
          setSelectedCards([]);
          router.refresh();
        }
      } finally {
        setLoading(`updateStatus-${status}`, false);
      }
    });
  };

  const printableCardsList = cards.filter((c) => selectedCards.length === 0 || selectedCards.includes(c.id));
  const previewTemplate = previewCard ? templates.find((template) => template.id === previewCard.template_id) : null;

  function downloadAsWord() {
    const list = printableCardsList;
    if (!list.length) return;

    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Student ID Cards</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .card-table { width: 100%; border-collapse: separate; border-spacing: 15px; }
        .card-cell { width: 3.375in; height: 2.125in; border: 2px solid #cbd5e1; background-color: #ffffff; padding: 10px; vertical-align: top; border-radius: 8px; }
        .header { background-color: #eff6ff; padding: 5px; font-weight: bold; font-size: 11px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; }
        .title { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 5px; }
        .field { font-size: 10px; color: #334155; margin-bottom: 3px; }
      </style>
      </head>
      <body>
        <h2>Student Identity Cards Batch Export (${list.length} Records)</h2>
        <table className="card-table">
    `;

    list.forEach((card, index) => {
      const snap = card.snapshot || {};
      if (index % 2 === 0) htmlContent += "<tr>";

      htmlContent += `
        <td class="card-cell">
          <div class="header">ACADEMIC PUBLIC SCHOOL - ID CARD (v${card.version})</div>
          <div class="title">${snap.student_name || 'Student'}</div>
          <div class="field"><b>Adm No:</b> ${snap.admission_number || 'N/A'}</div>
          <div class="field"><b>Class / Sec:</b> ${snap.class_name || ''} - ${snap.section_name || ''}</div>
          <div class="field"><b>Roll No:</b> ${snap.roll_number || 'N/A'}</div>
          <div class="field"><b>Mobile:</b> ${snap.mobile_number || 'N/A'}</div>
          <div class="field"><b>Guardian:</b> ${snap.guardian_name || 'N/A'}</div>
          <div class="field"><b>Address:</b> ${snap.address || 'N/A'}</div>
        </td>
      `;

      if (index % 2 === 1 || index === list.length - 1) htmlContent += "</tr>";
    });

    htmlContent += "</table></body></html>";

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Student_ID_Cards_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (printMode) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="mb-6 flex items-center justify-between border-b pb-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Print Preview - Student ID Cards</h1>
            <p className="text-xs text-slate-500">Showing {printableCardsList.length} ID card(s) ready for print.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 inline-flex items-center gap-1.5"
            >
              <span>📄</span> Save as PDF / Print
            </button>
            <button
              onClick={downloadAsWord}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 inline-flex items-center gap-1.5"
            >
              <span>📝</span> Export MS Word (.doc)
            </button>
            <button
              onClick={() => setPrintMode(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close Preview
            </button>
          </div>
        </div>

        {/* Card Grid Layout for Print - Front and Back */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
          {printableCardsList.map((card) => {
            const snap = card.snapshot || {};
            const cardTemplate = templates.find((template) => template.id === card.template_id);
            const frontDesignPath = cardTemplate?.options?.front_file_path;
            const backDesignPath = cardTemplate?.options?.back_file_path;
            return (
              <div key={card.id} className="space-y-3 print:break-inside-avoid">
                {/* FRONT SIDE */}
                <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-md print:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                  {frontDesignPath && (
                    <img
                      src={`/api/id-card-designs/preview?file=${encodeURIComponent(frontDesignPath)}`}
                      alt={`${cardTemplate?.name || "ID card"} front design`}
                      className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                    />
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 bg-blue-50 -mx-3 -mt-3 p-2.5 rounded-t-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center font-bold text-[10px] text-white justify-center">
                        🎓
                      </div>
                      <div>
                        <h2 className="text-[10px] font-bold tracking-wider uppercase text-blue-900 line-clamp-1">ACADEMIC PUBLIC SCHOOL</h2>
                        <p className="text-[7px] text-blue-600 tracking-widest font-semibold uppercase">STUDENT IDENTITY CARD (FRONT)</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                      v{card.version}
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="w-14 h-16 rounded-md bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                      <span className="text-xl">👤</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{snap.student_name}</h3>
                      <p className="text-[9px] text-blue-700 font-mono font-medium">Adm No: <span className="text-slate-900 font-bold">{snap.admission_number}</span></p>
                      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-600">
                        <div>Class: <span className="font-semibold text-slate-900">{snap.class_name}</span></div>
                        <div>Sec: <span className="font-semibold text-slate-900">{snap.section_name}</span></div>
                        <div>Roll: <span className="font-semibold text-slate-900">{snap.roll_number}</span></div>
                        <div>Phone: <span className="font-semibold text-slate-900 truncate">{snap.mobile_number}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[7px] text-slate-500">
                    <span className="truncate max-w-[60%]">Guardian: {snap.guardian_name}</span>
                    <span className="font-mono text-blue-700 font-semibold">ID: {card.secure_token?.substring(0, 8)}</span>
                  </div>
                </div>

                {/* BACK SIDE */}
                <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-md print:shadow-none relative overflow-hidden">
                  {backDesignPath && (
                    <img
                      src={`/api/id-card-designs/preview?file=${encodeURIComponent(backDesignPath)}`}
                      alt={`${cardTemplate?.name || "ID card"} back design`}
                      className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                    />
                  )}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 bg-slate-50 -mx-3 -mt-3 p-2 rounded-t-lg">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-blue-800">Card Instructions & Address (Back)</span>
                    <span className="text-[7px] text-slate-500 font-mono">SECURE CARD</span>
                  </div>

                  <div className="space-y-1.5 text-[8px] text-slate-600 my-1">
                    <p><span className="font-semibold text-slate-900">Residential Address:</span> {snap.address || "N/A"}</p>
                    <p><span className="font-semibold text-slate-900">Emergency Contact:</span> {snap.mobile_number || "N/A"}</p>
                    <p className="text-[7px] text-slate-500 italic">If found, please return to the school administration office or contact school helpline immediately.</p>
                  </div>

                  {/* Barcode Mock */}
                  <div className="border-t border-slate-200 pt-1 flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <div className="h-4 w-32 bg-slate-900 rounded-2xs flex items-center justify-around px-1">
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1 bg-white" />
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1.5 bg-white" />
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1 bg-white" />
                      </div>
                      <span className="text-[6px] font-mono text-slate-500 mt-0.5">{snap.admission_number}</span>
                    </div>
                    <span className="text-[7px] text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition-all ${
            toastMessage.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Premium Header & Tab Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-base shadow-2xs border border-blue-100">🪪</span>
              Student Identity Cards
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Generate, print, track, and manage immutable student identity card records across academic sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Navigation Tabs - Responsive Fluid Segment Control */}
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-max md:w-full">
                <button
                  onClick={() => setActiveTab("generated")}
                  className={`w-max md:flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 md:justify-center md:text-center ${
                    activeTab === "generated"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>💳</span> Generated Cards
                  <span className={`ml-2 inline-flex items-center justify-center min-w-[28px] h-6 text-[11px] font-mono font-bold rounded-full ${
                    activeTab === "generated" ? "bg-blue-50 text-blue-700 border border-blue-200/60" : "bg-slate-200/80 text-slate-700"
                  }`}>
                    {cards.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("generate_new")}
                  className={`w-max md:flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 md:justify-center md:text-center ${
                    activeTab === "generate_new"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>⏳</span> Pending Generation
                  <span className={`ml-2 inline-flex items-center justify-center min-w-[28px] h-6 text-[11px] font-mono font-bold rounded-full ${
                    activeTab === "generate_new" ? "bg-blue-50 text-blue-700 border border-blue-200/60" : "bg-slate-200/80 text-slate-700"
                  }`}>
                    {studentsWithoutCards.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("templates")}
                  className={`w-max md:flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 md:justify-center md:text-center ${
                    activeTab === "templates"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🎨</span> Templates
                  <span className={`ml-2 inline-flex items-center justify-center min-w-[28px] h-6 text-[11px] font-mono font-bold rounded-full ${
                    activeTab === "templates" ? "bg-blue-50 text-blue-700 border border-blue-200/60" : "bg-slate-200/80 text-slate-700"
                  }`}>
                    {templates.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Toggle Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by student name or admission number..."
              value={filters.search}
              onChange={(e) => updateFilterParam("search", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all shrink-0 w-full sm:w-auto ${
              showFilters || filters.classId || filters.sectionId || filters.status
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>⚡ Filters</span>
            {(filters.classId || filters.sectionId || filters.status) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
            <span className="text-[10px] text-slate-400">{showFilters ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Collapsible Filter Control Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Session Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Session</label>
              <select
                value={filters.sessionId}
                onChange={(e) => updateFilterParam("session_id", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
              >
                {academicSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_current ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Class</label>
              <select
                value={filters.classId}
                onChange={(e) => updateFilterParam("class_id", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Section</label>
              <select
                value={filters.sectionId}
                onChange={(e) => updateFilterParam("section_id", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            {activeTab === "generated" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilterParam("status", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
                >
                  <option value="">All Statuses</option>
                  <option value="generated">Generated</option>
                  <option value="printed">Printed</option>
                  <option value="replaced">Replaced</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: GENERATED CARDS */}
      {activeTab === "generated" && (
        <div className="space-y-4">
          {/* Action toolbar */}
          {selectedCards.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-3.5 border border-blue-200 text-xs text-blue-900 font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-950">{selectedCards.length} card(s) selected:</span>
                <button
                  onClick={() => handleUpdateStatus("printed")}
                  disabled={loadingButtons['updateStatus-printed']}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  {loadingButtons['updateStatus-printed'] ? 'Processing...' : 'Mark as Printed'}
                </button>
                <button
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={loadingButtons['updateStatus-cancelled']}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-white font-semibold hover:bg-red-700 shadow-xs"
                >
                  {loadingButtons['updateStatus-cancelled'] ? 'Processing...' : 'Cancel Cards'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLoading('preview', true);
                    // small delay to show processing state before opening preview
                    setTimeout(() => {
                      setPrintMode(true);
                      setLoading('preview', false);
                    }, 150);
                  }}
                  disabled={loadingButtons['preview']}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-white font-semibold hover:bg-blue-700 shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>👁</span> {loadingButtons['preview'] ? 'Processing...' : `Batch Preview & PDF (${selectedCards.length})`}
                </button>
                <button
                  onClick={downloadAsWord}
                  className="rounded-lg border border-blue-300 bg-white px-3.5 py-1.5 text-blue-800 font-semibold hover:bg-blue-50 shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>📝</span> Export MS Word
                </button>
              </div>
            </div>
          )}

          {/* Generated Cards Table & Mobile Card View */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={cards.length > 0 && selectedCards.length === cards.length}
                      onChange={(e) => handleSelectAllCards(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Adm No.</th>
                  <th className="p-3">Class / Sec</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Generated At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No generated ID cards found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  cards.map((card) => {
                    const snap = card.snapshot || {};
                    return (
                      <tr key={card.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedCards.includes(card.id)}
                            onChange={() => handleSelectCard(card.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {snap.student_name || "N/A"}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-700">
                          {snap.admission_number || "N/A"}
                        </td>
                        <td className="p-3">
                          {snap.class_name} - {snap.section_name}
                        </td>
                        <td className="p-3 font-mono">v{card.version}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${
                              card.status === "printed"
                                ? "bg-emerald-100 text-emerald-800"
                                : card.status === "generated"
                                ? "bg-blue-100 text-blue-800"
                                                            : card.status === "cancelled"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-slate-100 text-slate-700"
                                                        }` }
                          >
                            {card.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(card.generated_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => setPreviewCard(card)}
                            className="text-slate-700 hover:text-slate-900 font-semibold"
                          >
                            👁 Preview
                          </button>
                          <button
                            onClick={() => handleGenerateCards([card.student_id])}
                            disabled={isPending}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Regenerate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile Card Grid View */}
            <div className="md:hidden divide-y divide-slate-100">
              {cards.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No generated ID cards found.
                </div>
              ) : (
                cards.map((card) => {
                  const snap = card.snapshot || {};
                  const isSelected = selectedCards.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      className={`p-4 space-y-3 transition ${
                        isSelected ? "bg-blue-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectCard(card.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{snap.student_name || "N/A"}</h4>
                            <p className="text-[11px] font-mono text-blue-700 font-medium">Adm No: {snap.admission_number || "N/A"}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize shrink-0 ${
                            card.status === "printed"
                              ? "bg-emerald-100 text-emerald-800"
                              : card.status === "generated"
                              ? "bg-blue-100 text-blue-800"
                              : card.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {card.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Class & Sec</span>
                          <span className="font-semibold text-slate-900">{snap.class_name || "N/A"} - {snap.section_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Version</span>
                          <span className="font-mono font-semibold text-slate-900">v{card.version}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                        <button
                          onClick={() => setPreviewCard(card)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 text-[11px] shadow-2xs"
                        >
                          👁 Preview Card
                        </button>
                        <button
                          onClick={() => handleGenerateCards([card.student_id])}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 text-[11px] shadow-2xs"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING GENERATION */}
      {activeTab === "generate_new" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
            <div>
              <p className="text-xs font-semibold text-blue-900">
                {studentsWithoutCards.length} student(s) currently do not have an active ID card in this session.
              </p>
              <p className="text-[11px] text-blue-700">
                Select students below to generate their identity cards and automatically open the printable PDF view.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!selectedStudentsToGenerate.length) {
                    showToast("Please select at least one student.", "error");
                    return;
                  }
                setLoading('generate_pdf', true);
                startTransition(async () => {
                  try {
                    const res = await generateStudentIdCards({
                      student_ids: selectedStudentsToGenerate,
                      session_id: filters.sessionId || currentSessionId,
                      template_id: selectedTemplate || undefined,
                    });

                    if (res.error) {
                      showToast(res.error, "error");
                    } else {
                      showToast(`Generated ${res.count} ID card(s). Opening Print / PDF view...`);
                      setSelectedStudentsToGenerate([]);
                      router.refresh();
                      setPrintMode(true);
                    }
                  } finally {
                    setLoading('generate_pdf', false);
                  }
                });
              }}
              disabled={loadingButtons['generate_pdf'] || !selectedStudentsToGenerate.length}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
              <span>🖨</span> {loadingButtons['generate_pdf'] ? "Processing..." : `Generate & PDF (${selectedStudentsToGenerate.length})`}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {/* Desktop Table */}
            <table className="hidden md:table w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        studentsWithoutCards.length > 0 &&
                        selectedStudentsToGenerate.length === studentsWithoutCards.length
                      }
                      onChange={(e) => handleSelectAllStudentsToGenerate(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Adm No.</th>
                  <th className="p-3">Class / Sec</th>
                  <th className="p-3">Roll No</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsWithoutCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      All students in this filter already have active ID cards!
                    </td>
                  </tr>
                ) : (
                  studentsWithoutCards.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentsToGenerate.includes(student.id)}
                          onChange={() => handleSelectStudentToGenerate(student.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {(student.profiles as any)?.full_name || "N/A"}
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-700">
                        {student.admission_number || "N/A"}
                      </td>
                      <td className="p-3">
                        {(student.classes as any)?.name || "N/A"} - {(student.sections as any)?.name || "N/A"}
                      </td>
                      <td className="p-3 font-mono">{student.roll_number || "N/A"}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleGenerateCards([student.id])}
                          disabled={isPending}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          Generate Card
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile Pending Student Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {studentsWithoutCards.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  All students in this filter already have active ID cards!
                </div>
              ) : (
                studentsWithoutCards.map((student) => {
                  const isSelected = selectedStudentsToGenerate.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`p-4 space-y-3 transition ${
                        isSelected ? "bg-blue-50/50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudentToGenerate(student.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{(student.profiles as any)?.full_name || "N/A"}</h4>
                            <p className="text-[11px] font-mono text-blue-700 font-medium">Adm No: {student.admission_number || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Class & Sec</span>
                          <span className="font-semibold text-slate-900">{(student.classes as any)?.name || "N/A"} - {(student.sections as any)?.name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Roll No</span>
                          <span className="font-mono font-semibold text-slate-900">{student.roll_number || "N/A"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-slate-100 pt-2.5">
                        <button
                          onClick={() => handleGenerateCards([student.id])}
                          disabled={isPending}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 text-[11px] shadow-2xs"
                        >
                          Generate Card
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Configured ID Card Templates</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Live preview rendered with sample student data</span>
              <button
                onClick={() => { window.location.href = '/students/id-cards/design'; }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                ➕ Upload Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                No custom templates found. System will auto-create default Standard Template on card generation.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                    {editingTemplateId === tpl.id ? (
                      <input
                        value={editingTemplateName}
                        onChange={(event) => setEditingTemplateName(event.target.value)}
                        className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
                        aria-label="Template name"
                      />
                    ) : (
                      <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                    )}
                    <p className="text-[11px] text-slate-500">{tpl.card_title}</p>
                    </div>
                    {tpl.is_default && (
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                        Default
                      </span>
                    )}
                  </div>

                  {editingTemplateId === tpl.id && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={editingTemplateDefault}
                        onChange={(event) => setEditingTemplateDefault(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Make default template
                    </label>
                  )}

                  {/* Card Visual Preview Box - Front & Back */}
                  <div className="flex flex-col items-center gap-4 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Front Side</span>
                      <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-md relative overflow-hidden shrink-0 transform-gpu">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                        {tpl.options?.front_file_path && (
                          tpl.options.front_file_path.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={`/api/id-card-designs/preview?file=${encodeURIComponent(tpl.options.front_file_path)}`}
                              title={`${tpl.name} front design`}
                              className="absolute inset-0 z-10 h-full w-full border-0 bg-white"
                            />
                          ) : (
                            <img
                              src={`/api/id-card-designs/preview?file=${encodeURIComponent(tpl.options.front_file_path)}`}
                              alt={`${tpl.name} front design`}
                              className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                            />
                          )
                        )}

                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 bg-blue-50 -mx-3 -mt-3 p-2.5 rounded-t-lg">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center font-bold text-[10px] text-white justify-center">
                              🎓
                            </div>
                            <div>
                              <h2 className="text-[10px] font-bold tracking-wider uppercase text-blue-900 line-clamp-1">ACADEMIC PUBLIC SCHOOL</h2>
                              <p className="text-[7px] text-blue-600 tracking-widest font-semibold uppercase">{tpl.card_title || "IDENTITY CARD"}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                            v1
                          </span>
                        </div>

                        <div className="flex items-center gap-3 my-1">
                          <div className="w-14 h-16 rounded-md bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                            <span className="text-xl">👤</span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h3 className="text-xs font-bold text-slate-900 truncate">Sample Student</h3>
                            <p className="text-[9px] text-blue-700 font-mono font-medium">Adm No: <span className="text-slate-900 font-bold">ADM-2026-001</span></p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-600">
                              <div>Class: <span className="font-semibold text-slate-900">X</span></div>
                              <div>Sec: <span className="font-semibold text-slate-900">A</span></div>
                              <div>Roll: <span className="font-semibold text-slate-900">101</span></div>
                              <div>Phone: <span className="font-semibold text-slate-900">+91 9876543210</span></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[7px] text-slate-500">
                          <span className="truncate max-w-[60%]">Guardian: John Doe</span>
                          <span className="font-mono text-blue-700 font-semibold">ID: PREVIEW</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Back Side</span>
                      <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-md relative overflow-hidden shrink-0 transform-gpu">
                        {tpl.options?.back_file_path && (
                          tpl.options.back_file_path.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={`/api/id-card-designs/preview?file=${encodeURIComponent(tpl.options.back_file_path)}`}
                              title={`${tpl.name} back design`}
                              className="absolute inset-0 z-10 h-full w-full border-0 bg-white"
                            />
                          ) : (
                            <img
                              src={`/api/id-card-designs/preview?file=${encodeURIComponent(tpl.options.back_file_path)}`}
                              alt={`${tpl.name} back design`}
                              className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                            />
                          )
                        )}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 bg-slate-50 -mx-3 -mt-3 p-2 rounded-t-lg">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-blue-800">Instructions & Address</span>
                          <span className="text-[7px] text-slate-500 font-mono">SECURE CARD</span>
                        </div>

                        <div className="space-y-1.5 text-[8px] text-slate-600 my-1">
                          <p><span className="font-semibold text-slate-900">Address:</span> 123 Education Lane, Knowledge Park, City</p>
                          <p><span className="font-semibold text-slate-900">Emergency Contact:</span> +91 9876543210</p>
                          <p className="text-[7px] text-slate-500 italic">If found, please return to the school office.</p>
                        </div>

                        <div className="border-t border-slate-200 pt-1 flex items-center justify-between">
                          <div className="flex flex-col items-start">
                            <div className="h-4 w-32 bg-slate-900 rounded-2xs flex items-center justify-around px-1">
                              <span className="h-full w-0.5 bg-white" />
                              <span className="h-full w-1 bg-white" />
                              <span className="h-full w-0.5 bg-white" />
                              <span className="h-full w-1.5 bg-white" />
                              <span className="h-full w-0.5 bg-white" />
                              <span className="h-full w-1 bg-white" />
                            </div>
                            <span className="text-[6px] font-mono text-slate-500 mt-0.5">ADM-2026-001</span>
                          </div>
                          <span className="text-[7px] text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Dimensions:</span>
                      <span className="font-medium">{tpl.width_mm}mm × {tpl.height_mm}mm ({tpl.orientation})</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-semibold text-emerald-600">Active</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {editingTemplateId === tpl.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveTemplateEdit}
                          disabled={loadingButtons["template-edit"]}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loadingButtons["template-edit"] ? "Saving..." : "Save changes"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => beginTemplateEdit(tpl)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Edit details
                        </button>
                        <a
                          href={`/students/id-cards/design?template_id=${encodeURIComponent(tpl.id)}`}
                          className="rounded-lg border border-blue-100 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Edit design
                        </a>
                        <button
                          type="button"
                          onClick={() => archiveTemplate(tpl.id)}
                          disabled={loadingButtons[`template-archive-${tpl.id}`]}
                          className="rounded-lg border border-red-100 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {loadingButtons[`template-archive-${tpl.id}`] ? "Archiving..." : "Archive"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* CARD PREVIEW POPUP MODAL */}
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
                <h3 className="text-base font-bold text-slate-900">
                  Identity Card Preview: {previewCard.snapshot?.student_name || previewCard.snapshot?.admission_number || "Unnamed student"}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Adm No: {previewCard.snapshot?.admission_number || "N/A"} · Version v{previewCard.version || 1}
                </p>
              </div>
              <button
                onClick={() => setPreviewCard(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Front & Back Cards Stack */}
            <div className="flex flex-col items-center gap-6 py-2">
              {/* FRONT SIDE */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Front Side</span>
                <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                  {previewTemplate?.options?.front_file_path && (
                    <img
                      src={`/api/id-card-designs/preview?file=${encodeURIComponent(previewTemplate.options.front_file_path)}`}
                      alt="Student ID card front design"
                      className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                    />
                  )}

                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 bg-blue-50 -mx-3 -mt-3 p-2.5 rounded-t-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center font-bold text-[10px] text-white justify-center">
                        🎓
                      </div>
                      <div>
                        <h2 className="text-[10px] font-bold tracking-wider uppercase text-blue-900 line-clamp-1">ACADEMIC PUBLIC SCHOOL</h2>
                        <p className="text-[7px] text-blue-600 tracking-widest font-semibold uppercase">STUDENT IDENTITY CARD</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                      v{previewCard.version || 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 my-1">
                    <div className="w-14 h-16 rounded-md bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                      <span className="text-xl">👤</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{previewCard.snapshot?.student_name || previewCard.snapshot?.admission_number || "Unnamed student"}</h3>
                      <p className="text-[9px] text-blue-700 font-mono font-medium">Adm No: <span className="text-slate-900 font-bold">{previewCard.snapshot?.admission_number || "N/A"}</span></p>
                      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-600">
                        <div>Class: <span className="font-semibold text-slate-900">{previewCard.snapshot?.class_name || "N/A"}</span></div>
                        <div>Sec: <span className="font-semibold text-slate-900">{previewCard.snapshot?.section_name || "N/A"}</span></div>
                        <div>Roll: <span className="font-semibold text-slate-900">{previewCard.snapshot?.roll_number || "N/A"}</span></div>
                        <div>Phone: <span className="font-semibold text-slate-900 truncate">{previewCard.snapshot?.mobile_number || "N/A"}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[7px] text-slate-500">
                    <span className="truncate max-w-[60%]">Guardian: {previewCard.snapshot?.guardian_name || "N/A"}</span>
                    <span className="font-mono text-blue-700 font-semibold">ID: {previewCard.secure_token?.substring(0, 8) || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Back Side</span>
                <div className="w-full max-w-[85mm] h-[54mm] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden shrink-0">
                  {previewTemplate?.options?.back_file_path && (
                    <img
                      src={`/api/id-card-designs/preview?file=${encodeURIComponent(previewTemplate.options.back_file_path)}`}
                      alt="Student ID card back design"
                      className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
                    />
                  )}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 bg-slate-50 -mx-3 -mt-3 p-2 rounded-t-lg">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-blue-800">Instructions & Address</span>
                    <span className="text-[7px] text-slate-500 font-mono">SECURE CARD</span>
                  </div>

                  <div className="space-y-1.5 text-[8px] text-slate-600 my-1">
                    <p><span className="font-semibold text-slate-900">Address:</span> {previewCard.snapshot?.address || "N/A"}</p>
                    <p><span className="font-semibold text-slate-900">Emergency Contact:</span> {previewCard.snapshot?.mobile_number || "N/A"}</p>
                    <p className="text-[7px] text-slate-500 italic">If found, please return to the school administration office or contact school helpline immediately.</p>
                  </div>

                  <div className="border-t border-slate-200 pt-1 flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <div className="h-4 w-32 bg-slate-900 rounded-2xs flex items-center justify-around px-1">
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1 bg-white" />
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1.5 bg-white" />
                        <span className="h-full w-0.5 bg-white" />
                        <span className="h-full w-1 bg-white" />
                      </div>
                      <span className="text-[6px] font-mono text-slate-500 mt-0.5">{previewCard.snapshot?.admission_number || "N/A"}</span>
                    </div>
                    <span className="text-[7px] text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setPreviewCard(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers for Client Component Hooks
function RouterHook() {
  return useRouter();
}

function SearchParamsHook() {
  return useSearchParams();
}
