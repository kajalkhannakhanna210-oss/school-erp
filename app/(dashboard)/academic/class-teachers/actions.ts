"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

export async function assignClassTeacher(input: {
  class_id: string;
  section_id: string;
  session_id: string;
  staff_id: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_teachers")
    .upsert(input, { onConflict: "section_id,session_id" });

  if (!error) {
    await recordServerAction({
      action: "Assign Class Teacher",
      module: "Academics",
      page: "Class Teachers & Allocation",
      resource: "/academic/class-teachers",
      outcome: `Assigned staff ${input.staff_id} to class ${input.class_id} section ${input.section_id}`,
    });
  }

  revalidatePath("/academic/class-teachers");
  return { error: error?.message ?? null };
}

export async function removeClassTeacher(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_teachers").delete().eq("id", id);

  if (!error) {
    await recordServerAction({
      action: "Remove Class Teacher",
      module: "Academics",
      page: "Class Teachers & Allocation",
      resource: "/academic/class-teachers",
      requestMethod: "DELETE",
      outcome: `Removed class teacher assignment ${id}`,
    });
  }

  revalidatePath("/academic/class-teachers");
  return { error: error?.message ?? null };
}

