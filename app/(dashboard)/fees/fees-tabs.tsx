"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toaster";
import { createClient } from "@/lib/supabase/client";
import {
  createFeeHead,
  saveFeeStructure,
  saveLateFeeRule,
  setFeeHeadActive,
  type FeeStructureLineInput,
} from "./actions";

type Option = { id: string; name: string };
type FeeHead = { id: string; name: string; is_active: boolean };

export function FeesTabs({
  feeHeads,
  classes,
  sessions,
}: {
  feeHeads: FeeHead[];
  classes: Option[];
  sessions: Option[];
}) {
  const [tab, setTab] = useState<"heads" | "structure" | "late-fee">("heads");

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-ink-100">
        {(
          [
            ["heads", "Fee Heads"],
            ["structure", "Structure by Class"],
            ["late-fee", "Late Fee Rules"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === key ? "border-b-2 border-gold text-ink-700" : "text-slate/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "heads" && <FeeHeadsTab feeHeads={feeHeads} />}
        {tab === "structure" && <StructureTab classes={classes} sessions={sessions} feeHeads={feeHeads} />}
        {tab === "late-fee" && <LateFeeTab classes={classes} sessions={sessions} />}
      </div>
    </div>
  );
}

function FeeHeadsTab({ feeHeads }: { feeHeads: FeeHead[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [toggleTarget, setToggleTarget] = useState<FeeHead | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await createFeeHead(name);
      if (error) {
        push(error, "error");
        return;
      }
      push("Fee head created");
      setName("");
    });
  }

  function handleToggle() {
    if (!toggleTarget) return;
    const next = !toggleTarget.is_active;
    startTransition(async () => {
      const { error } = await setFeeHeadActive(toggleTarget.id, next);
      setToggleTarget(null);
      if (error) {
        push(error, "error");
        return;
      }
      push(next ? "Fee head reactivated" : "Fee head deactivated");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h2 className="font-display text-lg text-ink-700">New fee head</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="fh-name">Name</Label>
            <Input
              id="fh-name"
              required
              placeholder="Tuition Fee"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            Add fee head
          </Button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
              <th className="pb-2">Name</th>
              <th className="pb-2">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {feeHeads.map((fh) => (
              <tr key={fh.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3">{fh.name}</td>
                <td className="py-3">{!fh.is_active && <Badge>Inactive</Badge>}</td>
                <td className="py-3 text-right">
                  <Button variant="ghost" onClick={() => setToggleTarget(fh)}>
                    {fh.is_active ? "Deactivate" : "Reactivate"}
                  </Button>
                </td>
              </tr>
            ))}
            {feeHeads.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate/50">
                  No fee heads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? "Deactivate fee head?" : "Reactivate fee head?"}
        description={
          toggleTarget?.is_active
            ? "It disappears from new fee structures, but existing structure entries and student fee history are kept."
            : "It becomes available again when building or editing a class's fee structure."
        }
        confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Reactivate"}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}

function StructureTab({
  classes,
  sessions,
  feeHeads,
}: {
  classes: Option[];
  sessions: Option[];
  feeHeads: FeeHead[];
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [lines, setLines] = useState<FeeStructureLineInput[] | null>(null);
  const [loading, setLoading] = useState(false);

  const activeFeeHeads = feeHeads.filter((fh) => fh.is_active);

  async function loadStructure() {
    if (!sessionId || !classId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("fee_structure_items")
      .select("*")
      .eq("session_id", sessionId)
      .eq("class_id", classId);

    const byHead = Object.fromEntries((existing ?? []).map((e: any) => [e.fee_head_id, e]));
    setLines(
      activeFeeHeads.map((fh) => {
        const ex = byHead[fh.id];
        return {
          fee_head_id: fh.id,
          included: !!ex,
          amount: ex ? String(ex.amount) : "",
          frequency: (ex?.frequency ?? "monthly") as "monthly" | "one_time",
          due_date: ex?.due_date ?? "",
          due_day_of_month: ex?.due_day_of_month ? String(ex.due_day_of_month) : "10",
        };
      })
    );
    setLoading(false);
  }

  function updateLine(feeHeadId: string, patch: Partial<FeeStructureLineInput>) {
    setLines((prev) => prev?.map((l) => (l.fee_head_id === feeHeadId ? { ...l, ...patch } : l)) ?? null);
  }

  function handleSave() {
    if (!lines) return;
    for (const line of lines) {
      if (line.included && !line.amount) {
        push("Every included fee head needs an amount", "error");
        return;
      }
    }
    startTransition(async () => {
      const { error } = await saveFeeStructure(sessionId, classId, lines);
      if (error) {
        push(error, "error");
        return;
      }
      push("Fee structure saved");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={sessionId}
          onChange={(e) => {
            setSessionId(e.target.value);
            setLines(null);
          }}
        >
          <option value="">Select session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setLines(null);
          }}
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={loadStructure} disabled={!sessionId || !classId || loading}>
          {loading ? "Loading…" : "Load structure"}
        </Button>
      </div>

      {lines && (
        <Card className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-slate/50">
                <th className="py-2">Include</th>
                <th className="py-2">Fee head</th>
                <th className="py-2">Amount (₹)</th>
                <th className="py-2">Frequency</th>
                <th className="py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const fh = activeFeeHeads.find((f) => f.id === line.fee_head_id)!;
                return (
                  <tr key={line.fee_head_id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={line.included}
                        onChange={(e) => updateLine(line.fee_head_id, { included: e.target.checked })}
                      />
                    </td>
                    <td className="py-2">{fh.name}</td>
                    <td className="py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!line.included}
                        value={line.amount}
                        onChange={(e) => updateLine(line.fee_head_id, { amount: e.target.value })}
                        className="mt-0 w-28"
                      />
                    </td>
                    <td className="py-2">
                      <select
                        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
                        disabled={!line.included}
                        value={line.frequency}
                        onChange={(e) =>
                          updateLine(line.fee_head_id, { frequency: e.target.value as "monthly" | "one_time" })
                        }
                      >
                        <option value="monthly">Monthly</option>
                        <option value="one_time">One-time</option>
                      </select>
                    </td>
                    <td className="py-2">
                      {line.frequency === "monthly" ? (
                        <Input
                          type="number"
                          min="1"
                          max="28"
                          disabled={!line.included}
                          value={line.due_day_of_month}
                          onChange={(e) => updateLine(line.fee_head_id, { due_day_of_month: e.target.value })}
                          className="mt-0 w-20"
                        />
                      ) : (
                        <Input
                          type="date"
                          disabled={!line.included}
                          value={line.due_date}
                          onChange={(e) => updateLine(line.fee_head_id, { due_date: e.target.value })}
                          className="mt-0"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button onClick={handleSave} disabled={pending} className="mt-4">
            {pending ? "Saving…" : "Save structure"}
          </Button>
        </Card>
      )}
    </div>
  );
}

function LateFeeTab({ classes, sessions }: { classes: Option[]; sessions: Option[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState(""); // "" = session-wide default
  const [ruleType, setRuleType] = useState("none");
  const [value, setValue] = useState("0");
  const [loading, setLoading] = useState(false);

  async function loadRule() {
    if (!sessionId) return;
    setLoading(true);
    const supabase = createClient();
    let query = supabase.from("late_fee_rules").select("*").eq("session_id", sessionId);
    query = classId ? query.eq("class_id", classId) : query.is("class_id", null);
    const { data } = await query.maybeSingle();
    setRuleType(data?.rule_type ?? "none");
    setValue(data ? String(data.value) : "0");
    setLoading(false);
  }

  function handleSave() {
    startTransition(async () => {
      const { error } = await saveLateFeeRule({
        session_id: sessionId,
        class_id: classId || null,
        rule_type: ruleType,
        value,
      });
      if (error) {
        push(error, "error");
        return;
      }
      push("Late fee rule saved");
    });
  }

  return (
    <div>
      <p className="text-sm text-slate/60">
        A class-specific rule overrides the session-wide default for that class only.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={sessionId}
          onChange={(e) => {
            setSessionId(e.target.value);
            setRuleType("none");
            setValue("0");
          }}
        >
          <option value="">Select session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="mt-1 rounded-md border border-ink-100 px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Session-wide default</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (override)
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={loadRule} disabled={!sessionId || loading}>
          {loading ? "Loading…" : "Load rule"}
        </Button>
      </div>

      <Card className="mt-6 max-w-md">
        <div className="space-y-4 text-sm">
          <div>
            <Label htmlFor="rule-type">Rule</Label>
            <select
              id="rule-type"
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
            >
              <option value="none">None — no late fee</option>
              <option value="per_day">Flat amount per day late</option>
              <option value="fixed">Fixed one-time amount</option>
              <option value="percentage">Percentage of the outstanding amount</option>
            </select>
          </div>
          {ruleType !== "none" && (
            <div>
              <Label htmlFor="rule-value">
                {ruleType === "percentage" ? "Percentage" : "Amount (₹)"}
              </Label>
              <Input
                id="rule-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}
          <Button onClick={handleSave} disabled={pending || !sessionId}>
            {pending ? "Saving…" : "Save rule"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
