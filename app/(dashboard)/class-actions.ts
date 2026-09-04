"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterDataContext } from "@/lib/security/master-data-context";

export async function setSelectedClassCookie(classId: string) {
  const context = await getMasterDataContext();
  if (!context.schoolId || !context.schools.some((school) => school.id === context.schoolId)) {
    return { error: "Select a school before selecting a class." };
  }

  const { data: schoolClass } = await createAdminClient()
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (!schoolClass) return { error: "That class is not available in the selected school." };

  const cookieStore = await cookies();
  cookieStore.set("selected_class_id", classId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { error: null };
}

export async function getSelectedClassCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("selected_class_id")?.value;
}
