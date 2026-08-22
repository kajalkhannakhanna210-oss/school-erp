"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { EnquiryRow, FollowupRow, AssignmentHistoryRow, AuditLogRow } from "@/lib/enquiries";
import { EnquiryActionsModal } from "../enquiry-actions-modal";

export function DetailViewClient({
  enquiry,
  followups,
  assignments,
  auditLogs,
  staffList,
}: {
  enquiry: EnquiryRow;
  followups: FollowupRow[];
  assignments: AssignmentHistoryRow[];
  auditLogs: AuditLogRow[];
  staffList: { id: string; full_name: string }[];
}) {
  const [activeTab, setActiveTab] = useState<"followups" | "assignments" | "audit">("followups");
  const [activeModal, setActiveModal] = useState<"assign" | "followup" | "status" | "won" | "lost" | null>(null);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-ink-100 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate/50">Enquiry ID</span>
            <p className="font-mono text-lg font-bold text-ink-700">{enquiry.enquiry_id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="bg-ink-700 text-white text-xs hover:bg-ink-600"
              onClick={() => setActiveModal("followup")}
            >
              + Add Follow-up
            </Button>
            <Button
              variant="outline"
              className="text-xs border-ink-100"
              onClick={() => setActiveModal("assign")}
            >
              👤 Assign Staff
            </Button>
            <Button
              variant="outline"
              className="text-xs border-ink-100"
              onClick={() => setActiveModal("status")}
            >
              🔄 Change Status
            </Button>

            {enquiry.status !== "Won" && (
              <Button
                className="bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                onClick={() => setActiveModal("won")}
              >
                ✓ Convert to Won
              </Button>
            )}
            {enquiry.status !== "Lost" && enquiry.status !== "Closed" && (
              <Button
                variant="ghost"
                className="text-rose-600 text-xs hover:bg-rose-50"
                onClick={() => setActiveModal("lost")}
              >
                ✕ Mark Lost
              </Button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {/* Student Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate/60">Student Info</h4>
            <div>
              <span className="text-xs text-slate/50">Full Name:</span>
              <p className="font-semibold text-ink-700">{enquiry.student_name}</p>
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
              <p className="font-medium text-ink-700">{enquiry.classes?.name || "—"}</p>
            </div>
          </div>

          {/* Parent & Contact Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate/60">Parent & Contact Info</h4>
            <div>
              <span className="text-xs text-slate/50">Parent/Guardian Name:</span>
              <p className="font-semibold text-ink-700">{enquiry.parent_name}</p>
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
              <p className="text-ink-700">{enquiry.email || "—"}</p>
              {enquiry.address && <p className="text-xs text-slate/70 mt-0.5">{enquiry.address}</p>}
            </div>
          </div>

          {/* Enquiry Management Meta */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate/60">Enquiry Management</h4>
            <div>
              <span className="text-xs text-slate/50">Enquiry Mode / Source:</span>
              <p className="text-ink-700">
                <span className="font-semibold">{enquiry.enquiry_type}</span> ({enquiry.source})
              </p>
            </div>
            <div>
              <span className="text-xs text-slate/50">Assigned Staff:</span>
              <p className="font-medium text-ink-700">{enquiry.assigned_staff?.full_name || "Unassigned"}</p>
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

        {enquiry.remarks && (
          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-xs text-ink-700">
            <span className="font-bold text-slate/60">Initial Remarks:</span> {enquiry.remarks}
          </div>
        )}
      </Card>

      {/* Tabs & Timelines */}
      <Card className="border-ink-100 p-5 shadow-sm sm:p-6">
        <div className="flex border-b border-ink-100">
          <button
            onClick={() => setActiveTab("followups")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "followups" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
            }`}
          >
            Follow-up Activity ({followups.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "assignments" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
            }`}
          >
            Staff Assignment Log ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "audit" ? "border-gold-500 text-gold-700" : "border-transparent text-slate/60 hover:text-ink-700"
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: Follow-up Timeline */}
        {activeTab === "followups" && (
          <div className="mt-4 space-y-4">
            {followups.map((f) => (
              <div key={f.id} className="relative pl-6 border-l-2 border-ink-100 py-1">
                <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-white" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-700">
                      {f.followup_type}
                    </span>
                    <span className="text-xs text-slate/60">by {f.staff?.full_name ?? "Staff"}</span>
                  </div>
                  <span className="text-xs text-slate/50">{formatDate(f.followup_date)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700 whitespace-pre-wrap">{f.notes}</p>
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
          <div className="mt-4 space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-ink-100/60 py-2.5 last:border-0 text-xs">
                <div>
                  <p className="font-semibold text-ink-700">
                    Assigned to: {a.assigned_to_profile?.full_name ?? "Staff"}
                  </p>
                  {a.remarks && <p className="text-slate/60">{a.remarks}</p>}
                </div>
                <div className="text-right text-slate/50">
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
          <div className="mt-4 space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-ink-100/60 py-2.5 last:border-0 text-xs">
                <div>
                  <span className="font-bold text-ink-700">{log.action}</span>
                  {log.details && <p className="text-slate/60">{log.details}</p>}
                </div>
                <div className="text-right text-slate/50">
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

      {/* Action Modal */}
      {activeModal && (
        <EnquiryActionsModal
          enquiry={enquiry}
          staffList={staffList}
          actionType={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
