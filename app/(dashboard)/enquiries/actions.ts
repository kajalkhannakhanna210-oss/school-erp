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
import { createAdminClient } from "@/lib/supabase/admin";

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

  if (!formData.class_id) {
    return { error: "Class Interested is required" };
  }

  if (!formData.dob) {
    return { error: "Date of Birth is required" };
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

  // Generate the ID and load the current profile together; both are
  // independent network requests on the save path.
  let enquiry_id: string | null = null;
  const [{ data: genData, error: genError }, { data: currentProfile }] = await Promise.all([
    supabase.rpc("generate_enquiry_id"),
    supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle(),
  ]);
  if (!genError && genData) {
    enquiry_id = Array.isArray(genData) ? genData[0] : genData as unknown as string;
  }
  if (!enquiry_id) {
    const year = new Date().getFullYear();
    const randomId = String(Math.floor(1000 + Math.random() * 9000));
    enquiry_id = `ENQ${year}${randomId}`;
  }

  // New enquiries without an explicit assignee are owned by a super admin.
  let assignedStaffId = formData.assigned_staff_id?.trim() || null;
  if (!assignedStaffId) {
    if (currentProfile?.role === "super_admin") {
      assignedStaffId = user.id;
    } else {
      const { data: superAdmin } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "super_admin")
        .limit(1)
        .maybeSingle();
      assignedStaffId = superAdmin?.id ?? null;
    }
  }

  if (!assignedStaffId) return { error: "No super admin is available for assignment" };

  const status: EnquiryStatus = "Assigned";

  // If assigning to a staff on creation, validate that staff is eligible for the class
  if (assignedStaffId && assignedStaffId !== user.id) {
    const { data: anyProfile } = await supabase.from("profiles").select("role").eq("id", assignedStaffId).maybeSingle();
    if (anyProfile?.role !== "super_admin") {
      // Assignment eligibility is based on the target staff member's View
      // Scope for the selected class.
      const { data: stScopes } = await supabase.from("staff_module_scopes").select("scope_type, resource_id, action_key").eq("staff_id", assignedStaffId).eq("module_key", "admission_enquiry");
      const stRows = (stScopes ?? []).filter((r: any) => !r.action_key || r.action_key === "ALL" || r.action_key === "view");
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
      assigned_staff_id: assignedStaffId,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // These records do not affect the newly-created enquiry response, so write
  // them concurrently to avoid adding another full network round-trip.
  await Promise.all([
    supabase.from("enquiry_audit_logs").insert({
      enquiry_id: enquiry.id,
      user_id: user.id,
      action: "Enquiry Created",
      previous_status: null,
      new_status: status,
      details: `Created enquiry ${enquiry_id} for ${formData.student_name}`,
    }),
    assignedStaffId
      ? supabase.from("enquiry_assignment_history").insert({
          enquiry_id: enquiry.id,
          assigned_to: assignedStaffId,
          assigned_by: user.id,
          remarks: "Initial assignment upon enquiry creation",
        })
      : Promise.resolve({ error: null }),
  ]);

  // Broadcast only after the authorized INSERT has succeeded. The payload
  // contains only the id; every receiving window re-checks authorization via
  // its server API before displaying the enquiry.
  try {
    const realtime = createAdminClient();
    const channel = realtime.channel("enquiries-live-broadcast");
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({ type: "broadcast", event: "NEW_ENQUIRY", payload: { id: enquiry.id } });
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    await realtime.removeChannel(channel);
  } catch {
    // The enquiry is already saved; live notification is best effort.
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

  // Won/Lost have their own permissions; all other transitions use Change Status.
  const statusAction = newStatus === "Won" ? "convert_won" : newStatus === "Lost" ? "mark_lost" : "change_status";
  const canStatus = await canPerformEnquiryAction(supabase, user.id, statusAction, enquiry.class_id, enquiry.assigned_staff_id);
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
