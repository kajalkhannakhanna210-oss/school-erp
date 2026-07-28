"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSession(input: {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}) {
  const supabase = await createClient();
  if (input.is_current) {
    await supabase.from("academic_sessions").update({ is_current: false }).eq("is_current", true);
  }
  const { error } = await supabase.from("academic_sessions").insert(input);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("academic_sessions").delete().eq("id", id);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}

export async function createClassRow(input: { name: string; sort_order: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert(input);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}

export async function deleteClassRow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}

export async function createSectionRow(input: { class_id: string; name: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").insert(input);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}

export async function deleteSectionRow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  revalidatePath("/academic");
  return { error: error?.message ?? null };
}
