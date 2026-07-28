"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { useToast } from "@/components/toaster";
import type { FeeLineWithPayments } from "@/lib/fees";
import { setStudentConcession } from "./actions";
import { PayButton } from "./pay-button";

export function FeeSummary({
  studentId,
  lines,
  canManage,
  showPayment,
  studentName,
  studentEmail,
}: {
  studentId: string;
  lines: FeeLineWithPayments[];
  canManage: boolean;
  showPayment?: boolean;
  studentName?: string;
  studentEmail?: string;
}) {
  const totalOutstanding = lines.reduce((sum, l) => sum + l.outstanding, 0);

  if (lines.length === 0) {
    return <p className="text-sm text-slate/50">No fee structure has been set for this class yet.</p>;
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="py-2">Fee Head</th>
              <th className="py-2">Gross</th>
              <th className="py-2">Concession</th>
              <th className="py-2">Net</th>
              <th className="py-2">Late Fee</th>
              <th className="py-2">Paid</th>
              <th className="py-2">Outstanding</th>
              <th className="py-2">Due</th>
              {(canManage || showPayment) && <th className="py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <FeeRow
                key={line.fee_head_id}
                studentId={studentId}
                line={line}
                canManage={canManage}
                showPayment={showPayment}
                studentName={studentName}
                studentEmail={studentEmail}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink-100 font-medium text-ink-700">
              <td className="py-2" colSpan={6}>
                Total outstanding
              </td>
              <td className="py-2 font-mono">₹{totalOutstanding.toFixed(2)}</td>
              <td className="py-2"></td>
              {(canManage || showPayment) && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function FeeRow({
  studentId,
  line,
  canManage,
  showPayment,
  studentName,
  studentEmail,
}: {
  studentId: string;
  line: FeeLineWithPayments;
  canManage: boolean;
  showPayment?: boolean;
  studentName?: string;
  studentEmail?: string;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<"none" | "percentage" | "fixed">(line.concession_type ?? "none");
  const [value, setValue] = useState(line.concession_value ? String(line.concession_value) : "");

  function handleSave() {
    startTransition(async () => {
      const { error } = await setStudentConcession(
        studentId,
        line.fee_head_id,
        type === "none" ? null : { concession_type: type, value }
      );
      if (error) {
        push(error, "error");
        return;
      }
      push("Concession updated");
      setEditing(false);
    });
  }

  return (
    <tr className="border-b border-ink-100 last:border-0 align-top">
      <td className="py-2">
        {line.fee_head_name}
        <div className="text-xs text-slate/40">{line.frequency === "monthly" ? "Monthly" : "One-time"}</div>
      </td>
      <td className="py-2 font-mono">₹{line.gross_amount.toFixed(2)}</td>
      <td className="py-2">
        {editing ? (
          <div className="flex flex-col gap-2">
            <select
              className="rounded-md border border-ink-100 px-2 py-1 text-xs"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="none">None</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            {type !== "none" && (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-0 w-24 text-xs"
              />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSave} disabled={pending}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : line.concession_type ? (
          <span className="font-mono">
            {line.concession_type === "percentage" ? `${line.concession_value}%` : `₹${line.concession_value}`}
          </span>
        ) : (
          <span className="text-slate/40">—</span>
        )}
      </td>
      <td className="py-2 font-mono">₹{line.net_amount.toFixed(2)}</td>
      <td className="py-2 font-mono">{line.late_fee > 0 ? `₹${line.late_fee.toFixed(2)}` : "—"}</td>
      <td className="py-2 font-mono">{line.paid_amount > 0 ? `₹${line.paid_amount.toFixed(2)}` : "—"}</td>
      <td className="py-2 font-mono">
        {line.outstanding > 0 ? `₹${line.outstanding.toFixed(2)}` : <span className="text-success">Paid</span>}
      </td>
      <td className="py-2 text-slate/70">{line.current_due_date}</td>
      {(canManage || showPayment) && (
        <td className="py-2 text-right">
          {canManage && !editing && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Edit concession
            </Button>
          )}
          {showPayment && line.outstanding > 0 && (
            <PayButton
              feeHeadId={line.fee_head_id}
              outstanding={line.outstanding}
              studentName={studentName ?? ""}
              studentEmail={studentEmail ?? ""}
            />
          )}
        </td>
      )}
    </tr>
  );
}
