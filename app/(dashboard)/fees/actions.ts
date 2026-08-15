"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

export async function createFeeHead(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fee_heads").insert({ name });
  if (!error) {
    await recordServerAction({
      action: "Create Fee Head",
      module: "Fees & Finance",
      page: "Fee Management",
      resource: "/fees",
      outcome: `Created fee head: ${name}`,
    });
  }
  revalidatePath("/fees");
  return { error: error?.message ?? null };
}

export async function setFeeHeadActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("fee_heads").update({ is_active: isActive }).eq("id", id);
  if (!error) {
    await recordServerAction({
      action: isActive ? "Activate Fee Head" : "Deactivate Fee Head",
      module: "Fees & Finance",
      page: "Fee Management",
      resource: "/fees",
      outcome: `Fee head ${id} set to ${isActive ? "Active" : "Inactive"}`,
    });
  }
  revalidatePath("/fees");
  return { error: error?.message ?? null };
}

export type FeeStructureLineInput = {
  fee_head_id: string;
  included: boolean;
  amount: string;
  frequency: "one_time" | "monthly";
  due_date: string;
  due_day_of_month: string;
};

export async function saveFeeStructure(sessionId: string, classId: string, lines: FeeStructureLineInput[]) {
  const supabase = await createClient();

  for (const line of lines) {
    if (!line.included) {
      const { error } = await supabase
        .from("fee_structure_items")
        .delete()
        .eq("session_id", sessionId)
        .eq("class_id", classId)
        .eq("fee_head_id", line.fee_head_id);
      if (error) return { error: error.message };
      continue;
    }

    const payload = {
      session_id: sessionId,
      class_id: classId,
      fee_head_id: line.fee_head_id,
      amount: Number(line.amount),
      frequency: line.frequency,
      due_day_of_month: line.frequency === "monthly" ? Number(line.due_day_of_month) : null,
      due_date: line.frequency === "one_time" ? line.due_date : null,
    };

    const { error } = await supabase
      .from("fee_structure_items")
      .upsert(payload, { onConflict: "session_id,class_id,fee_head_id" });
    if (error) return { error: error.message };
  }

  await recordServerAction({
    action: "Save Fee Structure",
    module: "Fees & Finance",
    page: "Fee Management",
    resource: "/fees",
    outcome: `Saved fee structure for class ${classId} (${lines.filter((l) => l.included).length} heads)`,
  });

  revalidatePath("/fees");
  return { error: null };
}

export async function saveLateFeeRule(input: {
  session_id: string;
  class_id: string | null;
  rule_type: string;
  value: string;
}) {
  const supabase = await createClient();

  let existing = supabase.from("late_fee_rules").select("id").eq("session_id", input.session_id);
  existing = input.class_id ? existing.eq("class_id", input.class_id) : existing.is("class_id", null);
  const { data: existingRow } = await existing.maybeSingle();

  const payload = {
    session_id: input.session_id,
    class_id: input.class_id,
    rule_type: input.rule_type,
    value: Number(input.value) || 0,
  };

  const { error } = existingRow
    ? await supabase.from("late_fee_rules").update(payload).eq("id", existingRow.id)
    : await supabase.from("late_fee_rules").insert(payload);

  if (!error) {
    await recordServerAction({
      action: "Save Late Fee Rule",
      module: "Fees & Finance",
      page: "Fee Management",
      resource: "/fees",
      outcome: `Saved late fee rule (${input.rule_type}: ${input.value})`,
    });
  }

  revalidatePath("/fees");
  return { error: error?.message ?? null };
}

export async function setStudentConcession(
  studentId: string,
  feeHeadId: string,
  concession: { concession_type: "percentage" | "fixed"; value: string } | null
) {
  const supabase = await createClient();

  if (!concession) {
    const { error } = await supabase
      .from("student_concessions")
      .delete()
      .eq("student_id", studentId)
      .eq("fee_head_id", feeHeadId);
    revalidatePath(`/students/${studentId}`);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("student_concessions").upsert(
    {
      student_id: studentId,
      fee_head_id: feeHeadId,
      concession_type: concession.concession_type,
      value: Number(concession.value) || 0,
    },
    { onConflict: "student_id,fee_head_id" }
  );

  if (!error) {
    await recordServerAction({
      action: "Set Student Fee Concession",
      module: "Fees & Finance",
      page: "Student Profile",
      resource: `/students/${studentId}`,
      outcome: `Set concession (${concession.concession_type}: ${concession.value}) for student ${studentId}`,
    });
  }

  revalidatePath(`/students/${studentId}`);
  return { error: error?.message ?? null };
}
