"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordServerAction } from "@/lib/security/access-logs";

function revalidateAcademicData() {
  revalidatePath("/academic");
  revalidatePath("/master");
}

function friendlyAcademicError(message?: string | null) {
  if (message?.includes("sections_class_id_name_key")) {
    return "This section already exists for one of the selected classes. Please choose a different section name.";
  }
  return message ?? null;
}

export async function createSession(input: {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) return { error: "Session name is required" };
  const { data: duplicate } = await supabase.from("academic_sessions").select("id").ilike("name", name).limit(1).maybeSingle();
  if (duplicate) return { error: "An academic session with this name already exists" };
  if (input.is_current) {
    await supabase.from("academic_sessions").update({ is_current: false }).eq("is_current", true);
  }
  const { error } = await supabase.from("academic_sessions").insert({ ...input, name });
  if (!error) {
    await recordServerAction({
      action: "Create Academic Session",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created session ${name} (${input.start_date} to ${input.end_date})`,
    });
  }
  revalidateAcademicData();
  return { error: friendlyAcademicError(error?.message) };
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("academic_sessions").delete().eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Delete Academic Session",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      requestMethod: "DELETE",
      outcome: `Deleted academic session ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function setCurrentSession(id: string) {
  const supabase = await createClient();
  const { error: clearError } = await supabase.from("academic_sessions").update({ is_current: false }).eq("is_current", true);
  if (clearError) return { error: clearError.message };
  const { error } = await supabase.from("academic_sessions").update({ is_current: true }).eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Set Current Academic Session",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      outcome: `Set active academic session to ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function createDepartment(name: string) {
  const supabase = await createClient();
  const cleanName = name.trim();
  const { error } = await supabase.from("departments").insert({ name: cleanName });
  if (!error) {
    await recordServerAction({
      action: "Create Department",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created department: ${cleanName}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Delete Department",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      requestMethod: "DELETE",
      outcome: `Deleted department ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function createDesignation(name: string) {
  const supabase = await createClient();
  const cleanName = name.trim();
  const { error } = await supabase.from("designations").insert({ name: cleanName });
  if (!error) {
    await recordServerAction({
      action: "Create Designation",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created designation: ${cleanName}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function deleteDesignation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("designations").delete().eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Delete Designation",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      requestMethod: "DELETE",
      outcome: `Deleted designation ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function createClassRow(input: { name: string; sort_order: number }) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) return { error: "Class name is required" };
  const { data: duplicate } = await supabase.from("classes").select("id").ilike("name", name).limit(1).maybeSingle();
  if (duplicate) return { error: "A class with this name already exists" };
  const { error } = await supabase.from("classes").insert({ ...input, name });
  if (!error) {
    await recordServerAction({
      action: "Create Class",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created class: ${name}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function updateClassRow(id: string, input: { name: string; sort_order: number }) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) return { error: "Class name is required" };
  const { data: currentClass, error: currentError } = await supabase.from("classes").select("name").eq("id", id).single();
  if (currentError || !currentClass) return { error: currentError?.message ?? "Class not found" };
  if (currentClass.name.trim().toLowerCase() !== name.toLowerCase()) {
    const { data: matchingClasses } = await supabase.from("classes").select("id").ilike("name", name);
    const duplicate = matchingClasses?.some((row) => String(row.id) !== String(id));
    if (duplicate) return { error: "A class with this name already exists" };
  }
  const { error } = await supabase.from("classes").update({ name, sort_order: input.sort_order }).eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Update Class",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      outcome: `Updated class ${name}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function deleteClassRow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Delete Class",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      requestMethod: "DELETE",
      outcome: `Deleted class ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function createSectionRow(input: { class_id: string; name: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").insert(input);
  if (!error) {
    await recordServerAction({
      action: "Create Section",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created section ${input.name} for class ${input.class_id}`,
    });
  }
  revalidateAcademicData();
  return { error: friendlyAcademicError(error?.message) };
}

export async function createSectionsForClasses(input: { class_ids: string[]; name: string }) {
  const supabase = await createClient();
  const name = input.name.trim();
  const classIds = [...new Set(input.class_ids)];
  if (!name) return { error: "Section name is required" };
  if (classIds.length === 0) return { error: "Select at least one class" };

  const { data: existing } = await supabase
    .from("sections")
    .select("class_id, classes(name)")
    .in("class_id", classIds)
    .ilike("name", name);
  if (existing?.length) {
    const names = existing
      .map((row) => {
        const classes = row.classes as { name: string }[] | { name: string } | null;
        return Array.isArray(classes) ? classes[0]?.name : classes?.name;
      })
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return { error: `Section "${name}" already exists for: ${names}` };
  }

  const { error } = await supabase.from("sections").insert(classIds.map((class_id) => ({ class_id, name })));
  if (!error) {
    await recordServerAction({
      action: "Bulk Create Sections",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      statusCode: 201,
      outcome: `Created section ${name} for ${classIds.length} classes`,
    });
  }
  revalidateAcademicData();
  return { error: friendlyAcademicError(error?.message) };
}

export async function deleteSectionRow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (!error) {
    await recordServerAction({
      action: "Delete Section",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      requestMethod: "DELETE",
      outcome: `Deleted section ${id}`,
    });
  }
  revalidateAcademicData();
  return { error: error?.message ?? null };
}

export async function updateSectionsName(ids: string[], name: string) {
  const supabase = await createClient();
  const cleanName = name.trim();
  if (!cleanName) return { error: "Section name is required" };
  const { error } = await supabase.from("sections").update({ name: cleanName }).in("id", ids);
  if (!error) {
    await recordServerAction({
      action: "Update Section Name",
      module: "Academics",
      page: "Master Academic Data",
      resource: "/master",
      outcome: `Renamed sections to ${cleanName} (${ids.length} sections)`,
    });
  }
  revalidateAcademicData();
  return { error: friendlyAcademicError(error?.message) };
}

