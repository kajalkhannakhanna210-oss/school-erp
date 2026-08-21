"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
// ConfirmDialog replaced by ArchiveControl modal for archive with remark/date
import { useToast } from "@/components/toaster";
import { setStudentActive } from "./actions";
import { GenerateIdCardButton } from "./generate-id-card-button";
import { ArchiveControl } from "./[id]/archive-control";

function formatStudentName(name?: string | null) {
  return (name ?? "").trim().toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unnamed student";
}

export type StudentRow = {
  id: string;
  photo_url: string | null;
  admission_number: string;
  roll_number: string | null;
  mobile_number: string | null;
  is_active: boolean;
  profiles: { full_name: string } | null;
  classes: { name: string } | null;
  sections: { name: string } | null;
};

export function StudentTable({ students, canManage }: { students: StudentRow[]; canManage: boolean }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<StudentRow | null>(null);
  const [photoTarget, setPhotoTarget] = useState<StudentRow | null>(null);

  function handleArchive() {
    if (!archiveTarget) return;
    const next = !archiveTarget.is_active;
    startTransition(async () => {
      const { error } = await setStudentActive(archiveTarget.id, next);
      setArchiveTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push(next ? "Student restored" : "Student archived");
    });
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/70 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate/60">
            <th className="px-4 py-3">Adm No.</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Class / Section</th>
            <th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-ink-100 transition hover:bg-gold-50/30 last:border-0">
              <td className="px-4 py-3 font-mono">{s.admission_number || "Not assigned"}</td>
              <td className="px-4 py-3">
                <Link href={`/students/${s.id}`} className="flex items-center gap-3 font-semibold text-ink-700 hover:text-gold-600">
                  <span role={s.photo_url ? "button" : undefined} tabIndex={s.photo_url ? 0 : undefined} onClick={(e) => { if (s.photo_url) { e.preventDefault(); e.stopPropagation(); setPhotoTarget(s); } }} onKeyDown={(e) => { if (s.photo_url && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setPhotoTarget(s); } }} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700">{s.photo_url ? <img src={s.photo_url} alt={`${formatStudentName(s.profiles?.full_name)} photo`} className="h-full w-full cursor-zoom-in object-cover" /> : formatStudentName(s.profiles?.full_name).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="truncate">{formatStudentName(s.profiles?.full_name)}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-slate/70">
                {s.classes?.name} {s.sections?.name && `- ${s.sections.name}`}
              </td>
              <td className="px-4 py-3 text-slate/70">{s.mobile_number}</td>
              <td className="px-4 py-3">{s.is_active ? <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span> : <Badge>Archived</Badge>}</td>
              <td className="px-4 py-3 text-right">
                {canManage && (
                  <div className="flex items-center justify-end gap-1.5">
                    {s.admission_number && (
                      <GenerateIdCardButton
                        studentId={s.id}
                        sessionId=""
                        admissionNumber={s.admission_number}
                      />
                    )}
                    <Link href={`/students/${s.id}/edit`}><Button variant="ghost">Edit</Button></Link>
                    <Button variant="ghost" onClick={() => setArchiveTarget(s)} disabled={pending}>
                      {s.is_active ? "Archive" : "Restore"}
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate/50">
                No students match this view.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      <div className="divide-y divide-ink-100 bg-white md:hidden">
        {students.map((s) => (
          <article key={s.id} className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
            <button
              type="button"
              onClick={() => s.photo_url && setPhotoTarget(s)}
              className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 text-[11px] font-bold text-ink-700"
              aria-label={`View ${s.profiles?.full_name || "student"} photo`}
            >
              {s.photo_url ? <img src={s.photo_url} alt={s.profiles?.full_name || "Student"} className={`h-full w-full object-cover ${s.photo_url ? "cursor-pointer" : ""}`} /> : (s.profiles?.full_name ?? "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
            </button>
            <div className="min-w-0 flex-1">
              <Link href={`/students/${s.id}`} className="flex min-w-0 items-center gap-3 font-semibold text-ink-700">
                <span className="block truncate text-sm font-semibold">{formatStudentName(s.profiles?.full_name)}</span>
              </Link>
              <p className="truncate text-xs font-mono text-slate/70">Adm No: {s.admission_number || "Not assigned"}</p>
              <p className="mt-1 truncate text-xs text-slate/70">{s.mobile_number || "No mobile number"}</p>
              <p className="truncate text-xs text-slate/60">{s.classes?.name || "No class"}{s.sections?.name && ` · ${s.sections.name}`}</p>
            </div>
            {canManage && (
              <div className="flex items-center gap-1">
                {s.admission_number && (
                  <GenerateIdCardButton
                    studentId={s.id}
                    sessionId=""
                    admissionNumber={s.admission_number}
                  />
                )}
                <a href={`/students/${s.id}/edit`} aria-label={`Edit ${s.profiles?.full_name || "student"}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-100 text-ink-600 hover:bg-ink-50"><span aria-hidden="true" className="text-base font-bold">✎</span></a>
              </div>
            )}
          </article>
        ))}
        {students.length === 0 && <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate/50">No students match this view.</p>}
      </div>
      {archiveTarget && (
        <ArchiveControl
          studentId={archiveTarget.id}
          isActive={archiveTarget.is_active}
          open={true}
          onClose={() => setArchiveTarget(null)}
          hideTrigger
        />
      )}
      {photoTarget?.photo_url && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setPhotoTarget(null)}>
          <div className="relative max-h-[90vh] max-w-lg rounded-xl bg-white p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close photo preview" onClick={() => setPhotoTarget(null)} className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-lg text-ink-700 shadow">×</button>
            <img src={photoTarget.photo_url} alt={`${photoTarget.profiles?.full_name ?? "Student"} photo`} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            <p className="px-2 py-2 text-center text-sm font-semibold text-ink-700">{formatStudentName(photoTarget.profiles?.full_name)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
