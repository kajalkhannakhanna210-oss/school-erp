"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/academic/class-teachers");
  return { error: error?.message ?? null };
}

export async function removeClassTeacher(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_teachers").delete().eq("id", id);
  revalidatePath("/academic/class-teachers");
  return { error: error?.message ?? null };
}
