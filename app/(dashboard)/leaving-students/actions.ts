"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createLeavingRequest,
  generateLeavingCertificate,
  transitionLeavingRequest,
  updateDepartmentClearance,
} from "@/lib/leaving-students-service";
import { ClearanceDepartment, LeavingReason, LeavingRequestStatus } from "@/lib/leaving-students";

export async function createLeavingRequestAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");

  const studentId = formData.get("studentId") as string;
  const leavingDate = formData.get("leavingDate") as string;
  const reason = formData.get("reason") as LeavingReason;
  const otherReasonDetails = (formData.get("otherReasonDetails") as string) || undefined;
  const detailedRemarks = (formData.get("detailedRemarks") as string) || undefined;

  if (!studentId || !leavingDate || !reason) {
    throw new Error("Missing required fields.");
  }

  const request = await createLeavingRequest(
    { studentId, leavingDate, reason, otherReasonDetails, detailedRemarks },
    user.id
  );
  revalidatePath("/leaving-students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/leaving-students/${request.id}`);
}

export async function updateClearanceAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");

  const requestId = formData.get("requestId") as string;
  const department = formData.get("department") as ClearanceDepartment;
  const status = formData.get("status") as "cleared" | "pending" | "not_applicable";
  const remarks = (formData.get("remarks") as string) || undefined;

  await updateDepartmentClearance(requestId, department, status, user.id, remarks);
  revalidatePath(`/leaving-students/${requestId}`);
  revalidatePath("/leaving-students");
}

export async function transitionRequestAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");

  const requestId = formData.get("requestId") as string;
  const targetStatus = formData.get("targetStatus") as LeavingRequestStatus;
  const remarks = (formData.get("remarks") as string) || undefined;
  const allowOverrideOutstanding = formData.get("allowOverrideOutstanding") === "true";

  await transitionLeavingRequest(
    requestId,
    targetStatus,
    user.id,
    remarks,
    allowOverrideOutstanding
  );
  revalidatePath(`/leaving-students/${requestId}`);
  revalidatePath("/leaving-students");
}

export async function generateCertificateAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");

  const requestId = formData.get("requestId") as string;

  await generateLeavingCertificate(requestId, user.id);
  revalidatePath(`/leaving-students/${requestId}`);
  revalidatePath("/leaving-students");
}
