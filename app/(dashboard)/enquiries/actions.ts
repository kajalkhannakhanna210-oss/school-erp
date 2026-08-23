"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  EnquiryStatus,
  EnquiryType,
  FollowupType,
} from "@/lib/enquiries";
import { isValidEnquiryTransition } from "@/lib/enquiries";
import { userHasPermission, getUserAdmissionScopes } from "@/lib/enquiries-server";

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

  // Permission: must have admission_enquiry.create
  const canCreate = await userHasPermission(supabase, user.id, "admission_enquiry.create");
  if (!canCreate) return { error: "You are not authorized to create enquiries" };

  // Scope: if not allowed ALL, the user's admission scopes must include the selected class
  const scopes = await getUserAdmissionScopes(supabase, user.id);
  if (!scopes.all) {
    if (!formData.class_id) return { error: "Class interested is required" };
    if (!(scopes.classes ?? []).includes(formData.class_id) && !scopes.ownAssigned) {
      return { error: "You are not authorized to create enquiries for this class" };
    }
  }

  const year = new Date().getFullYear();
  const randomId = String(
    Math.floor(1000 + Math.random() * 9000)
  );

  const enquiry_id = `ENQ${year}${randomId}`;

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

  // Permission: must have edit
  const canEdit = await userHasPermission(supabase, user.id, "admission_enquiry.edit");
  if (!canEdit) return { error: "You are not authorized to edit enquiries" };

  // Check scope for existing enquiry
  const { data: existing } = await supabase.from("enquiries").select("class_id, assigned_staff_id").eq("id", id).maybeSingle();
  if (!existing) return { error: "Enquiry not found" };

  const scopes = await getUserAdmissionScopes(supabase, user.id);
  if (!scopes.all) {
    if (!(scopes.classes ?? []).includes(existing.class_id) && !scopes.ownAssigned) {
      return { error: "You are not authorized to edit this enquiry" };
    }
  }

  // If changing class while an assigned staff exists, ensure assigned staff is eligible for new class (unless admin)
  if (existing.class_id !== formData.class_id && existing.assigned_staff_id) {
    const { data: sProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (sProfile?.role !== "super_admin") {
      const { data: ok } = await supabase.from("staff_module_scopes").select("*").eq("staff_id", existing.assigned_staff_id).eq("module_key", "admission_enquiry").eq("resource_id", formData.class_id).maybeSingle();
      if (!ok) return { error: "Assigned staff is not designated for the new class. Reassign before changing class or ask an Admin to override." };
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

  // Permission: actor must have assign permission
  const canAssign = await userHasPermission(supabase, user.id, "admission_enquiry.assign");
  if (!canAssign) return { error: "You are not authorized to assign enquiries" };

  // Actor scope: ensure actor can assign for this class (unless super_admin)
  const actorScopes = await getUserAdmissionScopes(supabase, user.id);
  const { data: actorProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actorProfile?.role !== "super_admin") {
    if (!actorScopes.all && !(actorScopes.classes ?? []).includes(current.class_id)) {
      return { error: "You are not authorized to assign staff for this enquiry's class" };
    }
  }

  // Validate target staff eligibility: must have admission_enquiry.* permission and be designated for class
  const { data: assignedProfile } = await supabase.from("profiles").select("role").eq("id", staffId).maybeSingle();
  if (assignedProfile?.role !== "super_admin") {
    const { data: perms } = await supabase.from("staff_permissions").select("permission_key").eq("staff_id", staffId).like("permission_key", "admission_enquiry.%");
    if (!perms || perms.length === 0) return { error: "Selected staff does not have admission enquiry permissions" };

    const { data: stScopes } = await supabase.from("staff_module_scopes").select("scope_type, resource_id").eq("staff_id", staffId).eq("module_key", "admission_enquiry");
    const stRows = stScopes ?? [];
    const stAll = stRows.some((r: any) => r.scope_type === "ALL");
    const stHasClass = stRows.some((r: any) => r.scope_type === "CLASS" && r.resource_id === current.class_id);
    if (!stAll && !stHasClass) return { error: "Selected staff is not designated for this enquiry's class" };
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

  const canFollow = await userHasPermission(supabase, user.id, "admission_enquiry.followup");
  const scopes = await getUserAdmissionScopes(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "super_admin";

  if (!isAdmin) {
    // Allowed if user has class scope for enquiry class
    if (!scopes.all) {
      const hasClass = (scopes.classes ?? []).includes(enquiry.class_id);
      const isAssigned = enquiry.assigned_staff_id === user.id;
      if (!hasClass && !(scopes.ownAssigned && isAssigned) && !isAssigned) {
        return { error: "You are not authorized to add follow-ups for this enquiry" };
      }
    }
    if (!canFollow) return { error: "You do not have follow-up permission" };
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

  // Authorization: ensure user can change status
  const canChange = await userHasPermission(supabase, user.id, "admission_enquiry.change_status");
  if (!canChange) return { error: "You are not authorized to change enquiry status" };

  const scopes = await getUserAdmissionScopes(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "super_admin") {
    if (!scopes.all) {
      const allowedClass = (scopes.classes ?? []).includes(enquiry.class_id);
      const isAssigned = enquiry.assigned_staff_id === user.id;
      if (!allowedClass && !(scopes.ownAssigned && isAssigned)) return { error: "You are not authorized to change status for this enquiry" };
    }
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