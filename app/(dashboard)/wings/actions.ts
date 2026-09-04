"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMasterDataContext } from "@/lib/security/master-data-context";
import { requirePageAccess } from "@/lib/require-role";

type WingInput = { school_id?: string; wing_code: string; wing_name: string; description?: string; display_order: number; is_active: boolean };
async function scope() { await requirePageAccess("wing_master"); const context = await getMasterDataContext(); return context.schools.length ? context : null; }

export async function createWing(input: WingInput) {
  const context = await scope(); if (!context) return { error: "Select an authorized school first." };
  const targetSchool = context.schools.find((school) => school.id === input.school_id) ?? context.schools.find((school) => school.id === context.schoolId);
  if (!targetSchool) return { error: "Select an authorized school first." };
  const payload = { ...input, wing_code: input.wing_code.trim().toUpperCase(), wing_name: input.wing_name.trim(), organization_id: targetSchool.organization_id, school_id: targetSchool.id };
  if (!payload.wing_code || !payload.wing_name) return { error: "Wing code and wing name are required." };
  const { error } = await (await createClient()).from("school_wings").insert(payload);
  revalidatePath("/wings");
  return { error: error?.code === "23505" ? "Wing code already exists in this school." : error?.message ?? null };
}

export async function updateWing(id: string, input: WingInput) {
  const context = await scope(); if (!context) return { error: "Select an authorized school first." };
  const { school_id: _schoolId, ...editable } = input;
  const { data: existingWing } = await (await createClient()).from("school_wings").select("school_id").eq("id", id).maybeSingle();
  if (!existingWing || !context.schools.some((school) => school.id === existingWing.school_id)) return { error: "Wing is not available in your permitted schools." };
  const payload = { ...editable, wing_code: input.wing_code.trim().toUpperCase(), wing_name: input.wing_name.trim() };
  const { error } = await (await createClient()).from("school_wings").update(payload).eq("id", id).eq("school_id", existingWing.school_id);
  revalidatePath("/wings");
  return { error: error?.code === "23505" ? "Wing code already exists in this school." : error?.message ?? null };
}

export async function toggleWingStatus(id: string, isActive: boolean, remark: string) {
  const context = await scope(); if (!context) return { error: "Select an authorized school first." };
  const cleanRemark = remark.trim();
  if (cleanRemark.length < 3) return { error: "Please enter a remark of at least 3 characters." };
  const supabase = await createClient(); const { data: wing } = await supabase.from("school_wings").select("school_id, organization_id").eq("id", id).maybeSingle();
  if (!wing || !context.schools.some((school) => school.id === wing.school_id)) return { error: "Wing is not available in your permitted schools." };
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("school_wings").update({ is_active: isActive, status_remark: cleanRemark, updated_at: new Date().toISOString() }).eq("id", id).eq("school_id", wing.school_id);
  if (error) return { error: error.message };
  const { error: historyError } = await supabase.from("wing_status_history").insert({ organization_id: wing.organization_id, school_id: wing.school_id, wing_id: id, status: isActive ? "active" : "inactive", reason: cleanRemark, created_by: user?.id ?? null });
  if (historyError) return { error: historyError.message };
  revalidatePath("/wings");
  return { error: null };
}

export async function saveWingPolicy(wingId: string, input: { prefix: string; suffix: string; starting_number: number; number_length: number; separator: string; include_academic_year: boolean; academic_year_format: string; reset_policy: string; is_active: boolean }) {
  const context = await scope(); if (!context) return { error: "Select an authorized school first." };
  const supabase = await createClient();
  const { data: wing } = await supabase.from("school_wings").select("id, school_id, organization_id").eq("id", wingId).maybeSingle();
  if (!wing) return { error: "Wing is not available in this school." };
  if (!context.schools.some((school) => school.id === wing.school_id)) return { error: "Wing is not available in your permitted schools." };
  if (!Number.isInteger(input.starting_number) || input.starting_number < 1 || !Number.isInteger(input.number_length) || input.number_length < 1 || input.number_length > 12) return { error: "Enter valid sequence settings." };
  const { data: existing } = await supabase.from("wing_admission_policies").select("id").eq("school_id", wing.school_id).eq("wing_id", wingId).maybeSingle();
  const { error } = await supabase.from("wing_admission_policies").upsert({ ...input, organization_id: wing.organization_id, school_id: wing.school_id, wing_id: wingId, ...(existing ? {} : { current_number: input.starting_number - 1 }), updated_at: new Date().toISOString() }, { onConflict: "school_id,wing_id" });
  revalidatePath("/wings"); return { error: error?.message ?? null };
}
