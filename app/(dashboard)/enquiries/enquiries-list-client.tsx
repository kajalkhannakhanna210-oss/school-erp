"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { EnquiryRow, STATUS_COLORS } from "@/lib/enquiries";
import { EnquiryActionsModal } from "./enquiry-actions-modal";
import { ExportEnquiryButton } from "./export-enquiry-button";

export function EnquiriesListClient({
  rows,
  canManage,
  staffList,
}: {
  rows: EnquiryRow[];
  canManage: boolean;
  staffList: { id: string; full_name: string }[];
}) {
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRow | null>(null);
  const [activeModal, setActiveModal] = useState<"assign" | "followup" | "status" | "won" | "lost" | null>(null);

  const openAction = (enquiry: EnquiryRow, type: "assign" | "followup" | "status" | "won" | "lost") => {
    setSelectedEnquiry(enquiry);
    setActiveModal(type);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const exportRows = rows.map((r) => ({
    Enquiry_ID: r.enquiry_id,
    Student_Name: r.student_name,
    Parent_Name: r.parent_name,
    Mobile: r.mobile,
    Class: r.classes?.name ?? "—",
    Type: r.enquiry_type,
    Source: r.source,
    Assigned_Staff: r.assigned_staff?.full_name ?? "Unassigned",
    Status: r.status,
    Next_Followup: r.next_followup_date ?? "—",
    Last_Followup: r.last_followup_date ?? "—",
    Created_At: r.created_at.slice(0, 10),
  }));

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3 sm:flex-row sm:items-center">
        <h2 className="font-display text-base font-bold text-ink-700">
          Enquiry Directory ({rows.length} records)
        </h2>

        <ExportEnquiryButton rows={exportRows} />
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/30 text-left text-xs font-bold uppercase tracking-wider text-slate/60">
              <th className="px-4 py-3">Enquiry ID</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Parent Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Type / Source</th>
              <th className="px-4 py-3">Assigned Staff</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next Follow-up</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOverdue = r.next_followup_date && r.next_followup_date < new Date().toISOString().slice(0, 10) && r.status !== 'Won' && r.status !== 'Lost' && r.status !== 'Closed';
              return (
                <tr key={r.id} className="border-b border-ink-100 transition hover:bg-gold-50/20 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-ink-700">
                    <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600 hover:underline">
                      {r.enquiry_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-700">
                    <Link href={`/enquiries/${r.id}`} className="hover:text-gold-600">
                      {r.student_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate/80">{r.parent_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate/70">{r.mobile}</td>
                  <td className="px-4 py-3">{r.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-semibold text-ink-700">{r.enquiry_type}</span>
                    <span className="block text-slate/50">{r.source}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate/80">
                    {r.assigned_staff?.full_name ?? <span className="italic text-slate/40">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        STATUS_COLORS[r.status]?.bg ?? "bg-slate-100"
                      } ${STATUS_COLORS[r.status]?.text ?? "text-slate-700"} ${
                        STATUS_COLORS[r.status]?.border ?? "border-slate-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={isOverdue ? "font-bold text-rose-600" : "text-slate/70"}>
                      {formatDate(r.next_followup_date)}
                    </span>
                    {isOverdue && <span className="block text-[10px] uppercase font-bold text-rose-600">Overdue</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/enquiries/${r.id}`}>
                        <Button variant="ghost" className="h-7 px-2 text-xs">
                          View
                        </Button>
                      </Link>
                      <Link href={`/enquiries/${r.id}/edit`}>
                        <Button variant="ghost" className="h-7 px-2 text-xs">
                          Edit
                        </Button>
                      </Link>

                      {/* Dropdown / Quick Action Menu */}
                      <button
                        onClick={() => openAction(r, "followup")}
                        title="Add Follow-up"
                        className="rounded px-2 py-1 text-xs font-bold text-ink-700 hover:bg-ink-100"
                      >
                        +Follow-up
                      </button>

                      <button
                        onClick={() => openAction(r, "assign")}
                        title="Assign Staff"
                        className="rounded px-1.5 py-1 text-xs font-semibold text-slate/70 hover:bg-ink-100"
                      >
                        Assign
                      </button>

                      <button
                        onClick={() => openAction(r, "status")}
                        title="Change Status"
                        className="rounded px-1.5 py-1 text-xs font-semibold text-slate/70 hover:bg-ink-100"
                      >
                        Status
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs text-slate/50">
                  No admission enquiries found matching active filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="divide-y divide-ink-100 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ink-700">{r.enquiry_id}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  STATUS_COLORS[r.status]?.bg ?? "bg-slate-100"
                } ${STATUS_COLORS[r.status]?.text ?? "text-slate-700"}`}
              >
                {r.status}
              </span>
            </div>
            <div>
              <p className="font-bold text-ink-700">{r.student_name}</p>
              <p className="text-xs text-slate/60">Parent: {r.parent_name} · {r.mobile}</p>
              <p className="text-xs text-slate/60">Class: {r.classes?.name ?? "N/A"} · {r.enquiry_type} ({r.source})</p>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-ink-100/60 pt-2">
              <span className="text-slate/60">Staff: {r.assigned_staff?.full_name ?? "Unassigned"}</span>
              <div className="flex gap-2">
                <Link href={`/enquiries/${r.id}`} className="font-semibold text-ink-700 hover:underline">
                  View
                </Link>
                <button onClick={() => openAction(r, "followup")} className="font-semibold text-gold-700">
                  +Follow-up
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Trigger */}
      {selectedEnquiry && activeModal && (
        <EnquiryActionsModal
          enquiry={selectedEnquiry}
          staffList={staffList}
          actionType={activeModal}
          onClose={() => {
            setSelectedEnquiry(null);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}
