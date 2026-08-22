"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";
import { recordServerAction } from "@/lib/security/access-logs";

export async function generateStudentIdCards(input: {
  student_ids: string[];
  session_id: string;
  template_id?: string;
  remarks?: string;
}) {
  const { user } = await requirePageAccess("student_id_cards");
  const supabase = await createClient();

  if (!input.student_ids.length) {
    return { error: "Select at least one student to generate an ID card." };
  }

  // Get active template or specified template
  let templateId = input.template_id;
  if (!templateId) {
    const { data: defaultTemplate } = await supabase
      .from("student_id_card_templates")
      .select("id")
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!defaultTemplate) {
      const { data: fallbackTemplate } = await supabase
        .from("student_id_card_templates")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      templateId = fallbackTemplate?.id;
    } else {
      templateId = defaultTemplate.id;
    }
  }

  if (!templateId) {
    // Auto-seed a default template if none exists
    const { data: createdTemplate, error: createTplError } = await supabase
      .from("student_id_card_templates")
      .insert({
        name: "Standard Student Card Template",
        card_title: "STUDENT IDENTITY CARD",
        orientation: "portrait",
        width_mm: 54,
        height_mm: 86,
        is_active: true,
        is_default: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createTplError) {
      return { error: `Failed to initialize default card template: ${createTplError.message}` };
    }
    templateId = createdTemplate.id;
  }

  // Fetch student details to build snapshots
  const { data: students, error: studentFetchErr } = await supabase
    .from("students")
    .select("id, roll_number, admission_number, father_name, mother_name, mobile_number, address, photo_path, profiles!students_id_fkey(full_name), classes(name), sections(name)")
    .in("id", input.student_ids);

  if (studentFetchErr) {
    return { error: `Failed to fetch student details: ${studentFetchErr.message}` };
  }

  // Filter to students that have a valid admission number
  const eligibleStudents = (students ?? []).filter((s) => s.admission_number && s.admission_number.trim().length > 0);

  if (!eligibleStudents.length) {
    return { error: "ID cards can only be generated for students who have an assigned Admission Number." };
  }

  let generatedCount = 0;

  for (const student of eligibleStudents) {
    const snapshot = {
      student_name: (student.profiles as any)?.full_name || "N/A",
      admission_number: student.admission_number || "N/A",
      roll_number: student.roll_number || "N/A",
      class_name: (student.classes as any)?.name || "N/A",
      section_name: (student.sections as any)?.name || "N/A",
      guardian_name: student.father_name || student.mother_name || "N/A",
      mobile_number: student.mobile_number || "N/A",
      address: student.address || "N/A",
      photo_path: student.photo_path || null,
    };

    // Check existing card version
    const { data: existingCard } = await supabase
      .from("student_id_cards")
      .select("id, version")
      .eq("student_id", student.id)
      .eq("session_id", input.session_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = existingCard ? existingCard.version + 1 : 1;

    // Mark previous active cards as replaced
    if (existingCard) {
      await supabase
        .from("student_id_cards")
        .update({ status: "replaced" })
        .eq("student_id", student.id)
        .eq("session_id", input.session_id)
        .in("status", ["generated", "printed"]);
    }

    // Insert new card
    const { data: newCard, error: insertError } = await supabase
      .from("student_id_cards")
      .insert({
        student_id: student.id,
        template_id: templateId,
        session_id: input.session_id,
        version: nextVersion,
        status: "generated",
        generated_by: user.id,
        remarks: input.remarks || null,
        snapshot,
      })
      .select("id")
      .single();

    if (!insertError && newCard) {
      generatedCount++;
      // Log audit entry
      await supabase.from("student_id_card_audit_logs").insert({
        card_id: newCard.id,
        student_id: student.id,
        template_id: templateId,
        user_id: user.id,
        action: nextVersion > 1 ? "regenerate" : "generate",
        new_status: "generated",
        remarks: input.remarks || (nextVersion > 1 ? `Regenerated version ${nextVersion}` : "Initial generation"),
      });
    }
  }

  await recordServerAction({
    action: "Generate Student ID Cards",
    module: "Students",
    page: "Student ID Cards",
    resource: "/students/id-cards",
    outcome: `Generated ${generatedCount} student ID cards`,
  });

  revalidatePath("/students/id-cards");
  return { error: null, count: generatedCount };
}

export async function updateCardStatus(cardIds: string[], status: "printed" | "cancelled" | "expired" | "lost" | "damaged", remarks?: string) {
  const { user } = await requirePageAccess("student_id_cards");
  const supabase = await createClient();

  if (!cardIds.length) {
    return { error: "No cards selected." };
  }

  const updateData: Record<string, any> = { status };
  if (status === "printed") {
    updateData.printed_at = new Date().toISOString();
    updateData.printed_by = user.id;
  }
  if (remarks) {
    updateData.remarks = remarks;
  }

  const { data: updatedCards, error } = await supabase
    .from("student_id_cards")
    .update(updateData)
    .in("id", cardIds)
    .select("id, student_id, template_id, status");

  if (error) {
    return { error: error.message };
  }

  // Record audit logs
  for (const card of updatedCards ?? []) {
    await supabase.from("student_id_card_audit_logs").insert({
      card_id: card.id,
      student_id: card.student_id,
      template_id: card.template_id,
      user_id: user.id,
      action: `update_status_${status}`,
      new_status: status,
      remarks: remarks || `Marked as ${status}`,
    });
  }

  await recordServerAction({
    action: `Update Card Status (${status})`,
    module: "Students",
    page: "Student ID Cards",
    resource: "/students/id-cards",
    outcome: `Updated ${updatedCards?.length ?? 0} cards to status ${status}`,
  });

  revalidatePath("/students/id-cards");
  return { error: null, count: updatedCards?.length ?? 0 };
}

export async function updateStudentIdCardTemplate(input: {
  id: string;
  name: string;
  is_default: boolean;
}) {
  const { user } = await requirePageAccess("student_id_cards");
  const supabase = await createClient();
  const name = input.name.trim().slice(0, 180);
  if (!name) return { error: "Template name is required." };

  if (input.is_default) {
    const { data: previousDefaults } = await supabase
      .from("student_id_card_templates")
      .select("id")
      .eq("is_default", true)
      .neq("id", input.id);
    const { error: clearError } = await supabase
      .from("student_id_card_templates")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearError) return { error: clearError.message };

    const { error: auditError } = await supabase.from("student_id_card_template_audit_logs").insert([
      ...(previousDefaults ?? []).map((template) => ({
        template_id: template.id,
        user_id: user.id,
        action: "unset_default",
      })),
      { template_id: input.id, user_id: user.id, action: "set_default" },
    ]);
    if (auditError) return { error: auditError.message };
  }

  const { error } = await supabase
    .from("student_id_card_templates")
    .update({ name, is_default: input.is_default })
    .eq("id", input.id);
  if (error) return { error: error.message };

  await recordServerAction({
    action: "Update Student ID Card Template",
    module: "Students",
    page: "Student ID Cards",
    resource: `/students/id-cards/templates/${input.id}`,
    outcome: `Updated template ${input.id} by ${user.id}`,
  });
  revalidatePath("/students/id-cards");
  return { error: null };
}

export async function archiveStudentIdCardTemplate(id: string) {
  const { user } = await requirePageAccess("student_id_cards");
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_id_card_templates")
    .update({ is_active: false, is_default: false })
    .eq("id", id);
  if (error) return { error: error.message };

  const { error: auditError } = await supabase
    .from("student_id_card_template_audit_logs")
    .insert({ template_id: id, user_id: user.id, action: "archived" });
  if (auditError) return { error: auditError.message };

  await recordServerAction({
    action: "Archive Student ID Card Template",
    module: "Students",
    page: "Student ID Cards",
    resource: `/students/id-cards/templates/${id}`,
    outcome: `Archived template ${id} by ${user.id}`,
  });
  revalidatePath("/students/id-cards");
  return { error: null };
}
