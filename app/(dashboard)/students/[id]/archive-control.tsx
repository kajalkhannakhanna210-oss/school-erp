"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { archiveStudent, restoreStudent } from "../actions";

export function ArchiveControl({ studentId, isActive, open: openProp, onClose, hideTrigger = false }: { studentId: string; isActive: boolean; open?: boolean; onClose?: () => void; hideTrigger?: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(openProp ?? false);
  const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [remark, setRemark] = useState("");

  // parse parts for day/month/year dropdowns
  const parseParts = (iso: string) => {
    const [y, m, d] = iso.split("-").map((v) => Number(v));
    return { day: d || 1, month: m || 1, year: y || new Date().getFullYear() };
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  const currentYear = today.getFullYear();
  const startYear = currentYear - 50;
  const endYear = currentYear + 10;

  const [{ day, month, year }, setParts] = useState(() => parseParts(archiveDate));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [calendarPos, setCalendarPos] = useState<{ left: number; top: number } | null>(null);

  // Sync controlled prop if provided
  useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  // keep archiveDate in sync if parts change
  useEffect(() => {
    // clamp day to valid range
    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    const maxDay = daysInMonth(year, month);
    const clampedDay = Math.min(Math.max(1, day), maxDay);
    if (clampedDay !== day) setParts((p) => ({ ...p, day: clampedDay }));
    const mStr = String(month).padStart(2, "0");
    const dStr = String(clampedDay).padStart(2, "0");
    const iso = `${year}-${mStr}-${dStr}`;
    setArchiveDate(iso);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  function handleConfirm() {
    if (!archiveDate) {
      push("Please select an archive date", "error");
      return;
    }
    if (!remark.trim()) {
      push("Please enter a remark", "error");
      return;
    }

    startTransition(async () => {
      const { error } = isActive
        ? await archiveStudent(studentId, archiveDate, remark.trim())
        : await restoreStudent(studentId);

      // close modal (controlled or uncontrolled)
      if (onClose) onClose(); else setOpen(false);

      if (error) {
        push(error, "error");
        return;
      }
      push(isActive ? "Student archived" : "Student restored", "success");
      const newIso = new Date().toISOString().split("T")[0];
      setArchiveDate(newIso);
      setParts(parseParts(newIso));
      setRemark("");
    });
  }

  // If controlled and hideTrigger is true, don't render the trigger button when closed
  if (!open) {
    if (hideTrigger) return null;
    return (
      <Button variant={isActive ? "danger" : "ghost"} onClick={() => setOpen(true)} disabled={pending}>
        {isActive ? "Archive" : "Restore"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-sm whitespace-normal overflow-hidden rounded-lg bg-white shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-6">
          <h2 className="font-display text-lg text-ink-700">{isActive ? "Archive student?" : "Restore student?"}</h2>
          <p className="mt-2 whitespace-normal break-words text-sm leading-6 text-slate/70">
            {isActive
              ? "Archived students are hidden from the active roster but their fee and attendance history is kept."
              : "This student will reappear in the active roster."}
          </p>

          {isActive ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="archive-date">Date of Archiving *</Label>

                <div className="relative">
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                      const btn = buttonRef.current;
                      if (btn) {
                        const rect = btn.getBoundingClientRect();
                        setCalendarPos({ left: rect.left + window.scrollX, top: rect.bottom + window.scrollY });
                      }
                      setCalendarOpen((v) => !v);
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-ink-100 px-3 py-1 text-sm"
                    aria-expanded={String(!!calendarOpen)}
                    disabled={pending}
                  >
                    <span className="font-mono">{String(day).padStart(2, "0")}</span>
                    <span className="text-slate-600"> {months[month - 1]} {year}</span>
                    <svg className="ml-2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>

                  {calendarOpen && (
                    <div style={{ position: 'fixed', left: calendarPos ? `${calendarPos.left}px` : '50%', top: calendarPos ? `${calendarPos.top}px` : '50%', transform: calendarPos ? 'none' : 'translateX(-50%)' }} className="z-50 w-64 rounded-lg border bg-white p-3 shadow-lg">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <select
                          value={String(month)}
                          onChange={(e) => setParts((p) => ({ ...p, month: Number(e.target.value) }))}
                          disabled={pending}
                          className="flex-1 rounded-md border border-ink-100 px-2 py-1 text-sm"
                        >
                          {months.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>

                        <select
                          value={String(year)}
                          onChange={(e) => setParts((p) => ({ ...p, year: Number(e.target.value) }))}
                          disabled={pending}
                          className="w-28 rounded-md border border-ink-100 px-2 py-1 text-sm"
                        >
                          {Array.from({ length: endYear - startYear + 1 }).map((_, i) => {
                            const y = startYear + i;
                            return (
                              <option key={y} value={y}>{y}</option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-xs text-center text-slate-400 mb-2">
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <div key={d}>{d}</div>)}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-sm">
                        {(() => {
                          const firstWeekday = new Date(year, month - 1, 1).getDay();
                          const dim = new Date(year, month, 0).getDate();
                          const blanks = Array.from({ length: firstWeekday }).map((_, i) => <div key={`b${i}`}>&nbsp;</div>);
                          const days = Array.from({ length: dim }).map((_, i) => {
                            const d = i + 1;
                            const selected = d === day && month === Number(month) && year === Number(year);
                            return (
                              <button
                                key={`d${d}`}
                                type="button"
                                onClick={() => { setParts((p) => ({ ...p, day: d })); setCalendarOpen(false); }}
                                className={`rounded-md py-1 ${selected ? 'bg-ink-900 text-white' : 'hover:bg-ink-50'}`}
                                disabled={pending}
                              >
                                {d}
                              </button>
                            );
                          });
                          return [...blanks, ...days];
                        })()}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <button type="button" onClick={() => { const iso = new Date().toISOString().split('T')[0]; setParts(parseParts(iso)); }} className="text-xs text-slate-600">Today</button>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCalendarOpen(false)} className="rounded-md border border-ink-100 px-3 py-1 text-xs">Done</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">Remark / Reason for Archiving *</Label>
                <Textarea
                  id="remark"
                  placeholder="Enter the reason for archiving this student..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  disabled={pending}
                  required
                  rows={4}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" className="!text-ink-700" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={isActive ? "danger" : "primary"}
              className="!text-white"
              onClick={handleConfirm}
              disabled={pending || (isActive && (!archiveDate || !remark.trim()))}
            >
              {pending && <svg className="mr-2 inline-block h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
              {pending ? "Processing..." : isActive ? "Archive" : "Restore"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
