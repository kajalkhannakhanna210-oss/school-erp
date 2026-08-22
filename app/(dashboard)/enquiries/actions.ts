"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidEnquiryTransition, EnquiryStatus, EnquiryType, FollowupType } from "@/lib/enquiries";

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

  if (!user) return { error: "Not signed in" };

  if (!formData.student_name?.trim()) return { error: "Student name is required" };
  if (!formData.parent_name?.trim()) return { error: "Parent/guardian name is required" };
  if (!formData.mobile?.trim()) return { error: "Mobile number is required" };

  // Generate unique enquiry ID
  const year = new Date().getFullYear();
  const randomId = String(Math.floor(1000 + Math.random() * 9000));
  const enquiry_id = `ENQ${year}${randomId}`;

  const status: EnquiryStatus = formData.assigned_staff_id ? "Assigned" : "New";

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
      alternate_mobile: formData.alternate_mobile?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      session_id: formData.session_id || null,
      enquiry_type: formData.enquiry_type || "Offline",
      source: formData.source || "Walk-in",
      remarks: formData.remarks?.trim() || null,
      assigned_staff_id: formData.assigned_staff_id || null,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Audit log
  await supabase.from("enquiry_audit_logs").insert({
    enquiry_id: enquiry.id,
    user_id: user.id,
    action: "Enquiry Created",
    previous_status: null,
    new_status: status,
    details: `Created enquiry ${enquiry_id} for ${formData.student_name}`,
  });

  // Assignment history if assigned on creation
  if (formData.assigned_staff_id) {
    await supabase.from("enquiry_assignment_history").insert({
      enquiry_id: enquiry.id,
      assigned_to: formData.assigned_staff_id,
      assigned_by: user.id,
      remarks: "Initial assignment upon enquiry creation",
    });
  }

  revalidatePath("/enquiries");
  return { success: true, enquiry };
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

  if (!user) return { error: "Not signed in" };

  if (!formData.student_name?.trim()) return { error: "Student name is required" };
  if (!formData.parent_name?.trim()) return { error: "Parent/guardian name is required" };
  if (!formData.mobile?.trim()) return { error: "Mobile number is required" };

  const { error } = await supabase
    .from("enquiries")
    .update({
      student_name: formData.student_name.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      class_id: formData.class_id || null,
      parent_name: formData.parent_name.trim(),
      mobile: formData.mobile.trim(),
      alternate_mobile: formData.alternate_mobile?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      session_id: formData.session_id || null,
      enquiry_type: formData.enquiry_type || "Offline",
      source: formData.source || "Walk-in",
      remarks: formData.remarks?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("enquiry_audit_logs").insert({
    enquiry_id: id,
    user_id: user.id,
    action: "Enquiry Updated",
    details: `Updated enquiry details for ${formData.student_name}`,
  });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { success: true };
}

export async function assignStaffAction(id: string, staffId: string, remarks?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };

  const { data: current } = await supabase.from("enquiries").select("status, assigned_staff_id").eq("id", id).single();
  if (!current) return { error: "Enquiry not found" };

  const newStatus: EnquiryStatus = current.status === "New" ? "Assigned" : current.status;

  const { error } = await supabase
    .from("enquiries")
    .update({
      assigned_staff_id: staffId,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("enquiry_assignment_history").insert({
    enquiry_id: id,
    assigned_to: staffId,
    assigned_by: user.id,
    remarks: remarks?.trim() || "Staff assigned to enquiry",
  });

  await supabase.from("enquiry_audit_logs").insert({
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

  if (!user) return { error: "Not signed in" };
  if (!formData.notes?.trim()) return { error: "Follow-up notes are required" };

  const followupDate = formData.followup_date || new Date().toISOString().slice(0, 10);
  const nextDate = formData.next_followup_date || null;

  const { error: fError } = await supabase.from("enquiry_followups").insert({
    enquiry_id: enquiryId,
    followup_type: formData.followup_type,
    notes: formData.notes.trim(),
    followup_date: followupDate,
    next_followup_date: nextDate,
    is_completed: formData.is_completed ?? true,
    staff_id: user.id,
  });

  if (fError) return { error: fError.message };

  const { data: enquiry } = await supabase.from("enquiries").select("status").eq("id", enquiryId).single();
  let nextStatus: EnquiryStatus = enquiry?.status ?? "Follow-up";
  if (nextStatus === "New" || nextStatus === "Assigned") {
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

  await supabase.from("enquiry_audit_logs").insert({
    enquiry_id: enquiryId,
    user_id: user.id,
    action: "Follow-up Added",
    previous_status: enquiry?.status,
    new_status: nextStatus,
    details: `${formData.followup_type} follow-up logged: ${formData.notes.trim().slice(0, 60)}...`,
  });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${enquiryId}`);
  return { success: true };
}

export async function updateEnquiryStatusAction(id: string, newStatus: EnquiryStatus, remarks?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };

  const { data: enquiry } = await supabase.from("enquiries").select("status, student_name").eq("id", id).single();
  if (!enquiry) return { error: "Enquiry not found" };

  if (!isValidEnquiryTransition(enquiry.status as EnquiryStatus, newStatus)) {
    return { error: `Invalid transition from ${enquiry.status} to ${newStatus}` };
  }

  const { error } = await supabase
    .from("enquiries")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("enquiry_audit_logs").insert({
    enquiry_id: id,
    user_id: user.id,
    action: `Status Changed to ${newStatus}`,
    previous_status: enquiry.status,
    new_status: newStatus,
    details: remarks?.trim() || `Status updated to ${newStatus}`,
  });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { success: true };
}

export async function deleteEnquiryAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return { error: "Only Super Admin can delete enquiries" };

  const { error } = await supabase.from("enquiries").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/enquiries");
  return { success: true };
}
