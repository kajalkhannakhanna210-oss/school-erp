import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { requirePageAccess } from "@/lib/require-role";
import {
  getLeavingRequestDetails,
  getStudentClearanceSummary,
} from "@/lib/leaving-students-service";
import {
  CLEARANCE_DEPARTMENTS,
  ClearanceDepartment,
  LEAVING_REASON_LABELS,
  LEAVING_STATUS_LABELS,
  LeavingReason,
  LeavingRequestStatus,
} from "@/lib/leaving-students";
import {
  generateCertificateAction,
  transitionRequestAction,
  updateClearanceAction,
} from "../actions";

export const dynamic = "force-dynamic";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateTimeStr?: string | null) {
  if (!dateTimeStr) return "N/A";
  return new Date(dateTimeStr).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function LeavingRequestDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  let accessInfo;
  try {
    accessInfo = await requirePageAccess("leaving_students");
  } catch {
    redirect("/dashboard");
  }

  const details = await getLeavingRequestDetails(params.id);
  if (!details) notFound();

  const { request, clearances, auditLogs } = details;

  // Real-time calculated clearance summary (Fees, Library, Transport)
  const clearanceSummary = await getStudentClearanceSummary(request.student_id);

  const isSuperAdmin = accessInfo.role === "super_admin";

  const clearanceMap = new Map(
    clearances.map((c: any) => [c.department, c])
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/leaving-students">
            <Button variant="outline" size="sm">
              ← Back to List
            </Button>
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-700">
            Leaving Request: {request.student_name}
          </h1>
          <p className="mt-1 text-sm text-slate/60">
            Admission No: <span className="font-mono font-semibold">{request.admission_number}</span> · Class:{" "}
            {(request.classes as any)?.name} {(request.sections as any)?.name ? `- ${(request.sections as any).name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1 text-sm">
            Status: {LEAVING_STATUS_LABELS[request.status as LeavingRequestStatus]}
          </Badge>
          {request.certificate_number && (
            <Badge variant="secondary" className="px-3 py-1 font-mono text-sm">
              TC #: {request.certificate_number}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Details & Clearances */}
        <div className="space-y-6 lg:col-span-2">
          {/* Student & Leaving Info */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              Student & Leaving Overview
            </h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate/60">Father's Name</p>
                <p className="font-medium text-ink-800">{request.father_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate/60">Mother's Name</p>
                <p className="font-medium text-ink-800">{request.mother_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate/60">Date of Admission</p>
                <p className="font-medium text-ink-800">{formatDate(request.admission_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate/60">Requested Leaving Date</p>
                <p className="font-medium text-ink-800">{formatDate(request.leaving_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate/60">Reason for Leaving</p>
                <p className="font-medium text-ink-800">
                  {LEAVING_REASON_LABELS[request.reason as LeavingReason]}
                  {request.other_reason_details && ` (${request.other_reason_details})`}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate/60">Academic Session</p>
                <p className="font-medium text-ink-800">{(request.academic_sessions as any)?.name}</p>
              </div>
            </div>

            {request.detailed_remarks && (
              <div className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-700">
                <p className="font-bold">Remarks:</p>
                <p className="mt-1">{request.detailed_remarks}</p>
              </div>
            )}
          </Card>

          {/* Verification & System Clearances (Fees, Library, Transport) */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              System Verification & Dues Summary
            </h2>
            <div className="mt-4 space-y-4">
              {/* Fee Clearance Box */}
              <div className="rounded-lg border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink-800">Fee Clearance</h3>
                  {clearanceSummary.fees.cleared ? (
                    <Badge variant="default">Fee Cleared ✓</Badge>
                  ) : (
                    <Badge variant="destructive">Outstanding Dues ⚠️</Badge>
                  )}
                </div>

                {!clearanceSummary.fees.cleared && (
                  <div className="mt-2 rounded bg-red-50 p-2.5 text-xs text-red-700">
                    <strong>Warning:</strong> Student has outstanding dues of ₹
                    {clearanceSummary.fees.outstandingFees.toLocaleString("en-IN")}.
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="bg-ink-50 p-2 rounded">
                    <span className="text-slate/60">Total Fees:</span>
                    <p className="font-semibold">₹{clearanceSummary.fees.totalFees.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-ink-50 p-2 rounded">
                    <span className="text-slate/60">Paid Amount:</span>
                    <p className="font-semibold text-emerald-600">₹{clearanceSummary.fees.paidAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-ink-50 p-2 rounded">
                    <span className="text-slate/60">Late Fine:</span>
                    <p className="font-semibold">₹{clearanceSummary.fees.fineAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-ink-50 p-2 rounded">
                    <span className="text-slate/60">Outstanding:</span>
                    <p className="font-semibold text-rose-600">₹{clearanceSummary.fees.outstandingFees.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Library Clearance Box */}
              <div className="rounded-lg border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink-800">Library Clearance</h3>
                  <Badge variant="default">Cleared ✓</Badge>
                </div>
                <p className="mt-1 text-xs text-slate/60">No pending book returns or library fines registered.</p>
              </div>

              {/* Transport Clearance Box */}
              <div className="rounded-lg border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink-800">Transport Clearance</h3>
                  <Badge variant="default">Cleared ✓</Badge>
                </div>
                <p className="mt-1 text-xs text-slate/60">No outstanding transport dues.</p>
              </div>
            </div>
          </Card>

          {/* Departmental Clearances Checklist */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              Departmental Clearance Sign-offs
            </h2>
            <div className="mt-4 space-y-3">
              {CLEARANCE_DEPARTMENTS.map((dept) => {
                const c = clearanceMap.get(dept);
                const currentStatus = c?.status || "pending";
                return (
                  <div
                    key={dept}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-ink-800">{dept}</p>
                      {c?.cleared_at && (
                        <p className="text-xs text-slate/60">
                          Cleared by {(c.profiles as any)?.full_name || "Staff"} on {formatDateTime(c.cleared_at)}
                        </p>
                      )}
                      {c?.remarks && <p className="text-xs text-ink-600 italic">"{c.remarks}"</p>}
                    </div>

                    <form action={updateClearanceAction} className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="department" value={dept} />
                      <select
                        name="status"
                        defaultValue={currentStatus}
                        className="rounded border border-ink-100 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="cleared">✓ Cleared</option>
                        <option value="not_applicable">N/A Not Applicable</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Save
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Audit Trail Log */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              Audit & Transition History
            </h2>
            <div className="mt-4 space-y-3">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="border-l-2 border-gold-500 pl-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-800">{log.action}</span>
                    <span className="text-slate/60">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-slate/70">
                    By {(log.profiles as any)?.full_name || "System User"}
                  </p>
                  {log.remarks && <p className="mt-1 text-ink-600 italic">{log.remarks}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Approval Controls & Certificate Generator */}
        <div className="space-y-6">
          {/* Approval Controls */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              Workflow Actions
            </h2>
            <div className="mt-4 space-y-4">
              {/* Transition to Verification Pending */}
              {request.status === "leaving_requested" && (
                <form action={transitionRequestAction} className="space-y-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="verification_pending" />
                  <Button type="submit" variant="primary" className="w-full">
                    Move to Verification Pending →
                  </Button>
                </form>
              )}

              {/* Final Approval Form */}
              {(request.status === "leaving_requested" || request.status === "verification_pending") && (
                <form action={transitionRequestAction} className="space-y-3 rounded-lg bg-ink-50 p-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="approved" />
                  <Label>Approval Remarks</Label>
                  <Input name="remarks" placeholder="Enter approval notes..." />
                  
                  {!clearanceSummary.fees.cleared && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                      <input type="checkbox" name="allowOverrideOutstanding" value="true" required={!isSuperAdmin} />
                      Override outstanding dues approval
                    </label>
                  )}

                  <Button type="submit" variant="primary" className="w-full">
                    Approve Leaving Request ✓
                  </Button>
                </form>
              )}

              {/* Rejection Form */}
              {(request.status === "leaving_requested" || request.status === "verification_pending") && (
                <form action={transitionRequestAction} className="space-y-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="rejected" />
                  <Label className="text-red-800">Rejection Remarks (Required) *</Label>
                  <Input name="remarks" required placeholder="Reason for rejection..." />
                  <Button type="submit" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-100">
                    Reject Request ✗
                  </Button>
                </form>
              )}

              {/* Send Back Form */}
              {request.status === "verification_pending" && (
                <form action={transitionRequestAction} className="space-y-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="leaving_requested" />
                  <Input name="remarks" required placeholder="Reason for sending back..." />
                  <Button type="submit" variant="outline" className="w-full">
                    Send Back to Initiator ↩
                  </Button>
                </form>
              )}

              {/* Cancel Request */}
              {(request.status === "leaving_requested" || request.status === "verification_pending" || request.status === "approved") && (
                <form action={transitionRequestAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="cancelled" />
                  <Button type="submit" variant="outline" className="w-full text-slate/60">
                    Cancel Request
                  </Button>
                </form>
              )}
            </div>
          </Card>

          {/* Certificate Generation & Documents */}
          <Card>
            <h2 className="border-b border-ink-100 pb-3 font-display text-lg font-bold text-ink-700">
              Transfer Certificate (TC)
            </h2>
            <div className="mt-4 space-y-4">
              {request.certificate_number ? (
                <div className="rounded-lg bg-emerald-50 p-4 text-center">
                  <p className="text-xs text-emerald-800">Certificate Issued:</p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-900">
                    {request.certificate_number}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Generated on {formatDateTime(request.certificate_generated_at)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate/60">
                  No certificate has been generated yet. Approval is required before issuing.
                </p>
              )}

              {(request.status === "approved" || request.status === "tc_generated") && (
                <form action={generateCertificateAction} className="space-y-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Button type="submit" variant="primary" className="w-full">
                    {request.certificate_number ? "Regenerate Certificate ↺" : "Generate TC Certificate 📄"}
                  </Button>
                </form>
              )}

              {request.certificate_number && (
                <div className="flex gap-2">
                  <Link href={`/leaving-students/${request.id}/print`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Print / Download TC 🖨️
                    </Button>
                  </Link>
                </div>
              )}

              {/* Complete Exit: Mark Student Left */}
              {request.status === "tc_generated" && (
                <form action={transitionRequestAction} className="pt-3 border-t border-ink-100">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="targetStatus" value="student_left" />
                  <Button type="submit" variant="primary" className="w-full bg-ink-900 text-gold-400">
                    Finalize & Mark Student Left 🚪
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
