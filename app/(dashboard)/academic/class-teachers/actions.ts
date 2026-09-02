"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";
import { getMasterDataContext } from "@/lib/security/master-data-context";

export async function assignClassTeacher(input: {
  class_id: string;
  section_id: string;
  session_id: string;
  staff_id: string;
}) {
  const supabase = await createClient();
  const context = await getMasterDataContext();
  if (!context.organizationId || !context.schoolId || !context.schools.some((school) => school.id === context.schoolId)) return { error: "Select an authorized school before saving Master Data." };
  const { error } = await supabase
    .from("class_teachers")
    .upsert({ ...input, organization_id: context.organizationId, school_id: context.schoolId }, { onConflict: "section_id,session_id" });

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
  const context = await getMasterDataContext();
  if (!context.organizationId || !context.schoolId) return { error: "Select an authorized school before changing Master Data." };
  const { error } = await supabase.from("class_teachers").delete().eq("id", id).eq("organization_id", context.organizationId).eq("school_id", context.schoolId);

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
