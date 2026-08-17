export type LeavingRequestStatus =
  | "leaving_requested"
  | "verification_pending"
  | "approved"
  | "tc_generated"
  | "student_left"
  | "rejected"
  | "cancelled";

export type LeavingReason =
  | "transfer_to_another_school"
  | "family_relocation"
  | "financial_reasons"
  | "completed_studies"
  | "health_reasons"
  | "personal_reasons"
  | "disciplinary_reason"
  | "other";

export type ClearanceStatusEnum = "cleared" | "pending" | "not_applicable";

export const LEAVING_REASON_LABELS: Record<LeavingReason, string> = {
  transfer_to_another_school: "Transfer to another school",
  family_relocation: "Family relocation",
  financial_reasons: "Financial reasons",
  completed_studies: "Completed studies",
  health_reasons: "Health reasons",
  personal_reasons: "Personal reasons",
  disciplinary_reason: "Disciplinary reason",
  other: "Other",
};

export const LEAVING_STATUS_LABELS: Record<LeavingRequestStatus, string> = {
  leaving_requested: "Leaving Requested",
  verification_pending: "Verification Pending",
  approved: "Approved",
  tc_generated: "TC / Certificate Generated",
  student_left: "Student Left",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const CLEARANCE_DEPARTMENTS = [
  "Accounts",
  "Library",
  "Transport",
  "Hostel",
  "Administration",
  "Academic Department",
  "IT",
  "Sports",
] as const;

export type ClearanceDepartment = typeof CLEARANCE_DEPARTMENTS[number];

// Workflow transition validation matrix
export const ALLOWED_TRANSITIONS: Record<LeavingRequestStatus, LeavingRequestStatus[]> = {
  leaving_requested: ["verification_pending", "rejected", "cancelled"],
  verification_pending: ["approved", "rejected", "cancelled", "leaving_requested"],
  approved: ["tc_generated", "student_left", "cancelled"],
  tc_generated: ["student_left"],
  student_left: [],
  rejected: [],
  cancelled: [],
};

export function isValidTransition(from: LeavingRequestStatus, to: LeavingRequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export type LeavingRequestFilter = {
  query?: string;
  classId?: string;
  sectionId?: string;
  sessionId?: string;
  status?: LeavingRequestStatus | "";
  clearanceStatus?: "cleared" | "pending" | "";
  reason?: LeavingReason | "";
  fromDate?: string;
  toDate?: string;
  page?: number;
  perPage?: number;
};


