"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  EnquiryStatus,
  EnquiryType,
  FollowupType,
} from "@/lib/enquiries";
import { isValidEnquiryTransition } from "@/lib/enquiries";
import { userHasPermission, getUserAdmissionScopes, getUserActionScope, canPerformEnquiryAction } from "@/lib/enquiries-server";

export async function createEnquiryAction(formData: {
  student_name: string;
  dob?: string | null;
  gender?: string | null;
  class_id?: string | null;
  parent_name: string;
  mobile: string;
  alternate_mobile?: string | null;
  email?: string | null;
  address?: string | null;
  session_id?: string | null;
  enquiry_type?: EnquiryType;
  source?: string;
  remarks?: string | null;
  assigned_staff_id?: string | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  if (!formData.student_name?.trim()) {
    return { error: "Student name is required" };
  }

  if (!formData.parent_name?.trim()) {
    return { error: "Parent/guardian name is required" };
  }

  if (!formData.mobile?.trim()) {
    return { error: "Mobile number is required" };
  }

  // Permission & Scope: create action scope check
  const canCreate = await canPerformEnquiryAction(supabase, user.id, "create", formData.class_id || null);
  if (!canCreate.allowed) {
    return { error: canCreate.reason || "You are not authorized to create enquiries for this class" };
  }

  // Generate a unique enquiry_id using the DB-side generator for concurrency safety
  let enquiry_id: string | null = null;
  try {
    const { data: genData, error: genError } = await supabase.rpc("generate_enquiry_id");
    if (!genError && genData) {
      // supabase.rpc may return scalar or array; normalize
      enquiry_id = Array.isArray(genData) ? genData[0] : genData as unknown as string;
    }
  } catch (e) {
    // fall back to a JS-generated ID if RPC fails
  }
  if (!enquiry_id) {
    const year = new Date().getFullYear();
    const randomId = String(Math.floor(1000 + Math.random() * 9000));
    enquiry_id = `ENQ${year}${randomId}`;
  }

  const status: EnquiryStatus =
    formData.assigned_staff_id
      ? "Assigned"
      : "New";

  // If assigning to a staff on creation, validate that staff is eligible for the class
  if (formData.assigned_staff_id) {
    // check assigned staff has at least one admission_enquiry permission
    const { data: anyProfile } = await supabase.from("profiles").select("role").eq("id", formData.assigned_staff_id).maybeSingle();
    if (anyProfile?.role !== "super_admin") {
      // ensure staff has any admission_enquiry.* permission
      const { data: perms } = await supabase.from("staff_permissions").select("permission_key").eq("staff_id", formData.assigned_staff_id).like("permission_key", "admission_enquiry.%");
      if (!perms || perms.length === 0) return { error: "Selected staff does not have admission enquiry permissions" };

      // ensure staff scope covers the selected class
      const { data: stScopes } = await supabase.from("staff_module_scopes").select("scope_type, resource_id").eq("staff_id", formData.assigned_staff_id).eq("module_key", "admission_enquiry");
      const stRows = stScopes ?? [];
      const stAll = stRows.some((r: any) => r.scope_type === "ALL");
      const stHasClass = stRows.some((r: any) => r.scope_type === "CLASS" && r.resource_id === formData.class_id);
      if (!stAll && !stHasClass) return { error: "Selected staff is not designated for the chosen class" };
    }
  }

  const { data: enquiry, error } = await supabase
    .from("enquiries")
    .insert({
      enquiry_id,
      student_name: formData.student_name.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      class_id: formData.class_id || null,
      parent_name: formData.parent_name.trim(),
      mobile: formData.mobile.trim(),
      alternate_mobile:
        formData.alternate_mobile?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      session_id: formData.session_id || null,
      enquiry_type:
        formData.enquiry_type || "Offline",
      source: formData.source || "Walk-in",
      remarks: formData.remarks?.trim() || null,
      assigned_staff_id:
        formData.assigned_staff_id || null,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("enquiry_audit_logs")
    .insert({
      enquiry_id: enquiry.id,
      user_id: user.id,
      action: "Enquiry Created",
      previous_status: null,
      new_status: status,
      details: `Created enquiry ${enquiry_id} for ${formData.student_name}`,
    });

  if (formData.assigned_staff_id) {
    await supabase
      .from("enquiry_assignment_history")
      .insert({
        enquiry_id: enquiry.id,
        assigned_to:
          formData.assigned_staff_id,
        assigned_by: user.id,
        remarks:
          "Initial assignment upon enquiry creation",
      });
  }

  revalidatePath("/enquiries");

  return {
    success: true,
    enquiry,
  };
}

export async function updateEnquiryAction(
  id: string,
  formData: {
    student_name: string;
    dob?: string | null;
    gender?: string | null;
    class_id?: string | null;
    parent_name: string;
    mobile: string;
    alternate_mobile?: string | null;
    email?: string | null;
    address?: string | null;
    session_id?: string | null;
    enquiry_type?: EnquiryType;
    source?: string;
    remarks?: string | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  if (!formData.student_name?.trim()) {
    return { error: "Student name is required" };
  }

  if (!formData.parent_name?.trim()) {
    return {
      error: "Parent/guardian name is required",
    };
  }

  if (!formData.mobile?.trim()) {
    return { error: "Mobile number is required" };
  }

  // Check scope for existing enquiry
  const { data: existing } = await supabase.from("enquiries").select("class_id, assigned_staff_id").eq("id", id).maybeSingle();
  if (!existing) return { error: "Enquiry not found" };

  // Permission & Scope: edit action check
  const canEdit = await canPerformEnquiryAction(supabase, user.id, "edit", existing.class_id, existing.assigned_staff_id);
  if (!canEdit.allowed) return { error: canEdit.reason || "You are not authorized to edit this enquiry" };

  // Rule #27: If changing class while an assigned staff exists, check target staff's Follow-up Scope
  if (formData.class_id && existing.class_id !== formData.class_id && existing.assigned_staff_id) {
    const { data: sProfile } = await supabase.from("profiles").select("role").eq("id", existing.assigned_staff_id).maybeSingle();
    if (sProfile?.role !== "super_admin") {
      const targetFollowupScope = await getUserActionScope(supabase, existing.assigned_staff_id, "followup");
      const targetHasFollowupPerm = await userHasPermission(supabase, existing.assigned_staff_id, "admission_enquiry.followup");
      if (!targetHasFollowupPerm || (!targetFollowupScope.all && !targetFollowupScope.classes.includes(formData.class_id))) {
        return { error: "Assigned staff does not have follow-up access for the new class. Reassign staff before changing class." };
      }
    }
  }

  const { error } = await supabase
    .from("enquiries")
    .update({
      student_name:
        formData.student_name.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      class_id: formData.class_id || null,
      parent_name:
        formData.parent_name.trim(),
      mobile: formData.mobile.trim(),
      alternate_mobile:
        formData.alternate_mobile?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      session_id: formData.session_id || null,
      enquiry_type:
        formData.enquiry_type || "Offline",
      source: formData.source || "Walk-in",
      remarks: formData.remarks?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("enquiry_audit_logs")
    .insert({
      enquiry_id: id,
      user_id: user.id,
      action: "Enquiry Updated",
      details: `Updated enquiry details for ${formData.student_name}`,
    });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  revalidatePath(`/enquiries/${id}/edit`);

  return { success: true };
}

export async function assignStaffAction(
  id: string,
  staffId: string,
  remarks?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  const { data: current } = await supabase
    .from("enquiries")
    .select("status, assigned_staff_id, class_id")
    .eq("id", id)
    .single();

  if (!current) {
    return { error: "Enquiry not found" };
  }

  // Permission & Scope: assign action check
  const canAssign = await canPerformEnquiryAction(supabase, user.id, "assign", current.class_id, current.assigned_staff_id);
  if (!canAssign.allowed) return { error: canAssign.reason || "You are not authorized to assign enquiries for this class" };

  // Rule #9 & #23 Target staff eligibility check:
  // Target staff must have Admission Enquiry Follow-up Permission + Follow-up Scope containing enquiry class.
  const { data: assignedProfile } = await supabase.from("profiles").select("role").eq("id", staffId).maybeSingle();
  if (assignedProfile?.role !== "super_admin") {
    const hasFollowupPerm = await userHasPermission(supabase, staffId, "admission_enquiry.followup");
    if (!hasFollowupPerm) return { error: "Selected staff does not have Admission Enquiry Follow-up permission" };

    const targetFollowupScope = await getUserActionScope(supabase, staffId, "followup");
    if (!targetFollowupScope.all && current.class_id && !targetFollowupScope.classes.includes(current.class_id)) {
      return { error: "Selected staff does not have follow-up scope for this enquiry's class" };
    }
  }

  const newStatus: EnquiryStatus =
    current.status === "New"
      ? "Assigned"
      : current.status;

  const { error } = await supabase
    .from("enquiries")
    .update({
      assigned_staff_id: staffId,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("enquiry_assignment_history")
    .insert({
      enquiry_id: id,
      assigned_to: staffId,
      assigned_by: user.id,
      remarks:
        remarks?.trim() ||
        "Staff assigned to enquiry",
    });

  await supabase
    .from("enquiry_audit_logs")
    .insert({
      enquiry_id: id,
      user_id: user.id,
      action: "Staff Assigned",
      previous_status: current.status,
      new_status: newStatus,
      details: `Assigned to staff ID: ${staffId}`,
    });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);

  return { success: true };
}

export async function addFollowupAction(
  enquiryId: string,
  formData: {
    followup_type: FollowupType;
    notes: string;
    followup_date?: string;
    next_followup_date?: string | null;
    is_completed?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  if (!formData.notes?.trim()) {
    return {
      error: "Follow-up notes are required",
    };
  }

  // Authorization: ensure user can add follow-up for this enquiry
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("status, class_id, assigned_staff_id")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { error: "Enquiry not found" };

  // Authorization Rule #6, #8: check Follow-up Permission + Follow-up Scope (not Create Scope)
  const canFollow = await canPerformEnquiryAction(supabase, user.id, "followup", enquiry.class_id, enquiry.assigned_staff_id);
  if (!canFollow.allowed) {
    return { error: canFollow.reason || "You are not authorized to add follow-ups for this enquiry" };
  }

  const followupDate =
    formData.followup_date ||
    new Date().toISOString().slice(0, 10);

  const nextDate =
    formData.next_followup_date || null;

  const { error: followupError } = await supabase
    .from("enquiry_followups")
    .insert({
      enquiry_id: enquiryId,
      followup_type: formData.followup_type,
      notes: formData.notes.trim(),
      followup_date: followupDate,
      next_followup_date: nextDate,
      is_completed:
        formData.is_completed ?? true,
      staff_id: user.id,
    });

  if (followupError) {
    return {
      error: followupError.message,
    };
  }

  let nextStatus: EnquiryStatus =
    (enquiry?.status as EnquiryStatus) ??
    "Follow-up";

  if (
    nextStatus === "New" ||
    nextStatus === "Assigned"
  ) {
    nextStatus = "Follow-up";
  }

  await supabase
    .from("enquiries")
    .update({
      status: nextStatus,
      last_followup_date: followupDate,
      next_followup_date: nextDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", enquiryId);

  await supabase
    .from("enquiry_audit_logs")
    .insert({
      enquiry_id: enquiryId,
      user_id: user.id,
      action: "Follow-up Added",
      previous_status: enquiry?.status,
      new_status: nextStatus,
      details: `${formData.followup_type} follow-up logged: ${formData.notes
        .trim()
        .slice(0, 60)}...`,
    });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${enquiryId}`);

  return { success: true };
}

export async function updateEnquiryStatusAction(
  id: string,
  newStatus: EnquiryStatus,
  remarks?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("status, student_name, class_id, assigned_staff_id")
    .eq("id", id)
    .single();

  if (!enquiry) {
    return { error: "Enquiry not found" };
  }

  if (
    !isValidEnquiryTransition(
      enquiry.status as EnquiryStatus,
      newStatus
    )
  ) {
    return {
      error: `Invalid transition from ${enquiry.status} to ${newStatus}`,
    };
  }

  // Authorization Rule #18: check Change Status Permission + Change Status Scope
  const canStatus = await canPerformEnquiryAction(supabase, user.id, "change_status", enquiry.class_id, enquiry.assigned_staff_id);
  if (!canStatus.allowed) {
    return { error: canStatus.reason || "You are not authorized to change status for this enquiry" };
  }

  const { error } = await supabase
    .from("enquiries")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("enquiry_audit_logs")
    .insert({
      enquiry_id: id,
      user_id: user.id,
      action: `Status Changed to ${newStatus}`,
      previous_status: enquiry.status,
      new_status: newStatus,
      details:
        remarks?.trim() ||
        `Status updated to ${newStatus}`,
    });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);

  return { success: true };
}

export async function deleteEnquiryAction(
  id: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return {
      error:
        "Only Super Admin can delete enquiries",
    };
  }

  const { error } = await supabase
    .from("enquiries")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/enquiries");

  return { success: true };
}