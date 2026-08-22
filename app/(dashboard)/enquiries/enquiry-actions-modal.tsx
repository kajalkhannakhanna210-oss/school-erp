"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toaster";
import { assignStaffAction, addFollowupAction, updateEnquiryStatusAction } from "./actions";
import { EnquiryRow, ENQUIRY_STATUSES, FOLLOWUP_TYPES, EnquiryStatus, FollowupType } from "@/lib/enquiries";

export function EnquiryActionsModal({
  enquiry,
  staffList,
  actionType,
  onClose,
}: {
  enquiry: EnquiryRow;
  staffList: { id: string; full_name: string }[];
  actionType: "assign" | "followup" | "status" | "won" | "lost";
  onClose: () => void;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  // Assign form state
  const [assignedStaffId, setAssignedStaffId] = useState(enquiry.assigned_staff_id ?? "");
  const [assignRemarks, setAssignRemarks] = useState("");

  // Follow-up form state
  const [followupType, setFollowupType] = useState<FollowupType>("Phone");
  const [followupNotes, setFollowupNotes] = useState("");
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextFollowupDate, setNextFollowupDate] = useState(enquiry.next_followup_date ?? "");

  // Status form state
  const [newStatus, setNewStatus] = useState<EnquiryStatus>(actionType === "won" ? "Won" : actionType === "lost" ? "Lost" : enquiry.status);
  const [statusRemarks, setStatusRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (actionType === "assign") {
        if (!assignedStaffId) {
          push("Select a staff member to assign", "error");
          return;
        }
        const res = await assignStaffAction(enquiry.id, assignedStaffId, assignRemarks);
        if (res.error) push(res.error, "error");
        else {
          push("Staff assigned successfully");
          onClose();
        }
      } else if (actionType === "followup") {
        if (!followupNotes.trim()) {
          push("Please enter follow-up notes", "error");
          return;
        }
        const res = await addFollowupAction(enquiry.id, {
          followup_type: followupType,
          notes: followupNotes,
          followup_date: followupDate,
          next_followup_date: nextFollowupDate || null,
        });
        if (res.error) push(res.error, "error");
        else {
          push("Follow-up recorded successfully");
          onClose();
        }
      } else if (actionType === "status" || actionType === "won" || actionType === "lost") {
        const targetStatus = actionType === "won" ? "Won" : actionType === "lost" ? "Lost" : newStatus;
        const res = await updateEnquiryStatusAction(enquiry.id, targetStatus, statusRemarks);
        if (res.error) push(res.error, "error");
        else {
          push(`Status updated to ${targetStatus}`);
          onClose();
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink-700">
              {actionType === "assign" && "Assign Staff Member"}
              {actionType === "followup" && "Add Follow-up Activity"}
              {actionType === "status" && "Update Enquiry Status"}
              {actionType === "won" && "Mark Enquiry as Won"}
              {actionType === "lost" && "Mark Enquiry as Lost"}
            </h3>
            <p className="text-xs text-slate/60">
              Enquiry: <span className="font-semibold">{enquiry.enquiry_id}</span> ({enquiry.student_name})
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate/50 hover:bg-ink-50 hover:text-ink-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          {/* Assign Staff Form */}
          {actionType === "assign" && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                  Select Staff Member *
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
                  required
                >
                  <option value="">Choose Staff...</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                  Assignment Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="Notes for assigned staff..."
                  className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
                />
              </div>
            </>
          )}

          {/* Add Follow-up Form */}
          {actionType === "followup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                    Interaction Type *
                  </label>
                  <select
                    value={followupType}
                    onChange={(e) => setFollowupType(e.target.value as FollowupType)}
                    className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
                  >
                    {FOLLOWUP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                  Discussion Notes *
                </label>
                <textarea
                  rows={3}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Details of conversation, parent response..."
                  className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
                />
              </div>
            </>
          )}

          {/* Status Change Form */}
          {actionType === "status" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                New Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as EnquiryStatus)}
                className="w-full rounded-lg border border-ink-100 bg-white p-2.5 text-sm"
              >
                {ENQUIRY_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(actionType === "status" || actionType === "won" || actionType === "lost") && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate/70 mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder={actionType === "won" ? "Admission confirmed details..." : actionType === "lost" ? "Reason for lost enquiry..." : "Status update remarks..."}
                className="w-full rounded-lg border border-ink-100 p-2.5 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className={`px-5 text-white ${
                actionType === "won" ? "bg-emerald-600 hover:bg-emerald-700" : actionType === "lost" ? "bg-rose-600 hover:bg-rose-700" : "bg-ink-700 hover:bg-ink-600"
              }`}
            >
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
