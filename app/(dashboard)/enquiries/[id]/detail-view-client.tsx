"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { EnquiryRow, FollowupRow, AssignmentHistoryRow, AuditLogRow, EnquiryActionPermissions } from "@/lib/enquiries";

export function DetailViewClient({
  enquiry,
  followups,
  assignments,
  auditLogs,
  staffList,
  permissions,
}: {
  enquiry: EnquiryRow;
  followups: FollowupRow[];
  assignments: AssignmentHistoryRow[];
  auditLogs: AuditLogRow[];
  staffList: { id: string; full_name: string }[];
  permissions: EnquiryActionPermissions;
}) {
  const [activeTab, setActiveTab] = useState<"followups" | "assignments" | "audit">("followups");

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
        {/* Enquiry Information */}
      <Card className="overflow-hidden border-ink-100 !p-0 shadow-sm">
        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 text-sm">
          {/* Student Info */}
          <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
            <h4 className="border-b border-blue-100 bg-blue-50 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-700">Student Info</h4>
            <div className="space-y-2.5 p-3.5">
            <div>
              <span className="text-xs text-slate/50">Full Name:</span>
              <p className="break-words font-semibold text-ink-700">{enquiry.student_name}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Date of Birth:</span>
              <p className="text-ink-700">{formatDate(enquiry.dob)}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Gender:</span>
              <p className="text-ink-700">{enquiry.gender || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Class Interested:</span>
              <p className="break-words font-bold text-ink-700">{enquiry.classes?.name || "—"}</p>
            </div>
            </div>
          </div>

          {/* Parent & Contact Info */}
          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
            <h4 className="border-b border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-700">Parent & Contact</h4>
            <div className="space-y-2.5 p-3.5">
            <div>
              <span className="text-xs text-slate/50">Parent/Guardian Name:</span>
              <p className="break-words font-semibold text-ink-700">{enquiry.parent_name}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Mobile Number:</span>
              <p className="font-mono text-ink-700">{enquiry.mobile}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Alternate Mobile:</span>
              <p className="font-mono text-ink-700">{enquiry.alternate_mobile || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Email / Address:</span>
              <p className="break-words text-ink-700">{enquiry.email || "—"}</p>
              {enquiry.address && <p className="mt-0.5 break-words text-xs text-slate/70">{enquiry.address}</p>}
            </div>
            </div>
          </div>

          {/* Assignment and status */}
          <div className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
            <h4 className="border-b border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-700">Assignment & Follow-up</h4>
            <div className="space-y-2.5 p-3.5">
            <div>
              <span className="text-xs text-slate/50">Enquiry Mode / Source:</span>
              <p className="break-words text-ink-700">
                <span className="font-semibold">{enquiry.enquiry_type}</span> ({enquiry.source})
              </p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Assigned Staff:</span>
              <p className="break-words font-medium text-ink-700">{enquiry.assigned_staff?.full_name || "Unassigned"}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Assignment Scope:</span>
              <p className="break-words text-ink-700">{enquiry.classes?.name ? `Class ${enquiry.classes.name}` : "Unassigned class"}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Current Status:</span>
              <p className="font-semibold text-ink-700">{enquiry.status}</p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Next Follow-up Due:</span>
              <p className={`font-semibold ${enquiry.next_followup_date && enquiry.next_followup_date < new Date().toISOString().slice(0, 10) ? "text-rose-600" : "text-ink-700"}`}>
                {formatDate(enquiry.next_followup_date)}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Last Follow-up Date:</span>
              <p className="text-ink-700">{formatDate(enquiry.last_followup_date)}</p>
            </div>
            </div>
          </div>
        </div>

        {enquiry.remarks && (
          <div className="mx-4 mb-4 rounded-xl border border-ink-100 bg-ink-50/70 p-3 text-xs text-ink-700 sm:mx-5 sm:mb-5">
            <span className="font-bold text-slate/60">Initial Remarks:</span> {enquiry.remarks}
          </div>
        )}
      </Card>

      {/* Status, follow-up timeline, assignment history, and activity history */}
      <Card className="overflow-hidden border-ink-100 !p-0 shadow-sm">
        <div role="tablist" aria-label="Enquiry history" className="overflow-x-auto border-b border-ink-100 bg-ink-50/60 p-1.5 [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-max gap-1">
          <button
            role="tab"
            aria-selected={activeTab === "followups"}
            onClick={() => setActiveTab("followups")}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors sm:px-4 ${
              activeTab === "followups" ? "bg-gold-500 text-ink-900 shadow-sm ring-1 ring-gold-600/30" : "text-slate/60 hover:bg-white/70 hover:text-ink-700"
            }`}
          >
            Follow-up Timeline ({followups.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "assignments"}
            onClick={() => setActiveTab("assignments")}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors sm:px-4 ${
              activeTab === "assignments" ? "bg-gold-500 text-ink-900 shadow-sm ring-1 ring-gold-600/30" : "text-slate/60 hover:bg-white/70 hover:text-ink-700"
            }`}
          >
            Assignment History ({assignments.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "audit"}
            onClick={() => setActiveTab("audit")}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors sm:px-4 ${
              activeTab === "audit" ? "bg-gold-500 text-ink-900 shadow-sm ring-1 ring-gold-600/30" : "text-slate/60 hover:bg-white/70 hover:text-ink-700"
            }`}
          >
            Activity History ({auditLogs.length})
          </button>
          </div>
        </div>

        {/* Tab 1: Follow-up Timeline */}
        {activeTab === "followups" && (
          <div className="space-y-4 bg-ink-50/35 p-4 sm:p-5">
            {followups.map((f) => (
              <div key={f.id} className="relative rounded-xl border border-ink-100 bg-white p-3 pl-6 shadow-sm sm:p-4 sm:pl-7">
                <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-white" />
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-700">
                      {f.followup_type}
                    </span>
                    <span className="text-xs text-slate/60">by {f.staff?.full_name ?? "Staff"}</span>
                  </div>
                  <span className="text-xs text-slate/50">{formatDate(f.followup_date)}</span>
                </div>
                <p className="mt-2 break-words whitespace-pre-wrap text-sm text-ink-700">{f.notes}</p>
                {f.next_followup_date && (
                  <p className="mt-1 text-xs text-slate/60">
                    Next follow-up scheduled for: <span className="font-semibold text-ink-700">{formatDate(f.next_followup_date)}</span>
                  </p>
                )}
              </div>
            ))}
            {followups.length === 0 && (
              <p className="py-8 text-center text-xs text-slate/50">No follow-up activities recorded yet.</p>
            )}
          </div>
        )}

        {/* Tab 2: Assignment History */}
        {activeTab === "assignments" && (
          <div className="space-y-3 bg-ink-50/35 p-4 sm:p-5">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink-700">
                    Assigned to: {a.assigned_to_profile?.full_name ?? "Staff"}
                  </p>
                  {a.remarks && <p className="break-words text-slate/60">{a.remarks}</p>}
                </div>
                <div className="shrink-0 text-slate/50 sm:text-right">
                  <p>by {a.assigned_by_profile?.full_name ?? "System"}</p>
                  <p>{formatDate(a.created_at)}</p>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="py-8 text-center text-xs text-slate/50">No assignment history records.</p>
            )}
          </div>
        )}

        {/* Tab 3: Audit Trail */}
        {activeTab === "audit" && (
          <div className="space-y-3 bg-ink-50/35 p-4 sm:p-5">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="min-w-0">
                  <span className="break-words font-bold text-ink-700">{log.action}</span>
                  {log.details && <p className="break-words text-slate/60">{log.details}</p>}
                </div>
                <div className="shrink-0 text-slate/50 sm:text-right">
                  <p>{log.user?.full_name ?? "System"}</p>
                  <p>{formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="py-8 text-center text-xs text-slate/50">No audit log records.</p>
            )}
          </div>
        )}
      </Card>

    </div>
  );
}
