"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

type AttendanceRecordInput = { student_id: string; status: string };

export async function submitAttendance(input: {
  class_id: string;
  section_id: string;
  session_id: string;
  attendance_date: string;
  records: AttendanceRecordInput[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: batch, error: batchError } = await supabase
    .from("attendance_batches")
    .insert({
      class_id: input.class_id,
      section_id: input.section_id,
      session_id: input.session_id,
      attendance_date: input.attendance_date,
      marked_by: user!.id,
      is_locked: false,
    })
    .select()
    .single();

  if (batchError || !batch) {
    return { error: batchError?.message ?? "Could not start attendance for this date" };
  }

  const { error: recordsError } = await supabase.from("attendance_records").insert(
    input.records.map((r) => ({
      batch_id: batch.id,
      student_id: r.student_id,
      attendance_date: input.attendance_date,
      status: r.status,
    }))
  );

  if (recordsError) {
    // Don't leave an empty, orphaned batch behind if the records failed.
    await supabase.from("attendance_batches").delete().eq("id", batch.id);
    return { error: recordsError.message };
  }

  const { error: lockError } = await supabase
    .from("attendance_batches")
    .update({ is_locked: true })
    .eq("id", batch.id);

  await recordServerAction({
    action: "Submit Daily Attendance",
    module: "Attendance",
    page: "Attendance Register",
    resource: "/attendance",
    outcome: `Submitted attendance for ${input.records.length} students on ${input.attendance_date}`,
  });

  revalidatePath("/attendance");
  return { error: lockError?.message ?? null };
}

export async function resubmitAttendance(batchId: string, records: AttendanceRecordInput[]) {
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("attendance_batches")
    .select("attendance_date")
    .eq("id", batchId)
    .single();

  if (!batch) return { error: "Attendance batch not found" };

  const { error: upsertError } = await supabase.from("attendance_records").upsert(
    records.map((r) => ({
      batch_id: batchId,
      student_id: r.student_id,
      attendance_date: batch.attendance_date,
      status: r.status,
    })),
    { onConflict: "batch_id,student_id" }
  );

  if (upsertError) return { error: upsertError.message };

  const { error: lockError } = await supabase
    .from("attendance_batches")
    .update({ is_locked: true })
    .eq("id", batchId);

  await recordServerAction({
    action: "Resubmit Attendance",
    module: "Attendance",
    page: "Attendance Register",
    resource: "/attendance",
    outcome: `Resubmitted attendance for ${records.length} students`,
  });

  revalidatePath("/attendance");
  return { error: lockError?.message ?? null };
}

export async function unlockAttendance(batchId: string, label: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attendance_batches").update({ is_locked: false }).eq("id", batchId);
  if (error) return { error: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: user!.id,
    action: "unlock_attendance",
    description: `Unlocked attendance for ${label}`,
  });

  await recordServerAction({
    action: "Unlock Attendance",
    module: "Attendance",
    page: "Attendance Register",
    resource: "/attendance",
    outcome: `Unlocked attendance batch for ${label}`,
  });

  revalidatePath("/attendance");
  return { error: null };
}
