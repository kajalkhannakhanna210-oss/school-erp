export type EnquiryStatus =
  | "New"
  | "Assigned"
  | "Follow-up"
  | "Interested"
  | "Won"
  | "Lost"
  | "Closed";

export type EnquiryType =
  | "Online"
  | "Offline";

export type FollowupType =
  | "Phone"
  | "WhatsApp"
  | "Visit"
  | "Email"
  | "Other";

export type EnquirySource =
  | "Walk-in"
  | "Website"
  | "Referral"
  | "Social Media"
  | "Phone"
  | "Advertisement"
  | "Other";

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "New",
  "Assigned",
  "Follow-up",
  "Interested",
  "Won",
  "Lost",
  "Closed",
];

export const ENQUIRY_TYPES: EnquiryType[] = [
  "Online",
  "Offline",
];

export const FOLLOWUP_TYPES: FollowupType[] = [
  "Phone",
  "WhatsApp",
  "Visit",
  "Email",
  "Other",
];

export const ENQUIRY_SOURCES: EnquirySource[] = [
  "Walk-in",
  "Website",
  "Referral",
  "Social Media",
  "Phone",
  "Advertisement",
  "Other",
];

export function isValidEnquiryTransition(
  currentStatus: EnquiryStatus,
  newStatus: EnquiryStatus
): boolean {
  if (currentStatus === newStatus) return true;

  const transitions: Record<EnquiryStatus, EnquiryStatus[]> = {
    New: [
      "Assigned",
      "Follow-up",
      "Interested",
      "Won",
      "Lost",
      "Closed",
    ],
    Assigned: [
      "Follow-up",
      "Interested",
      "Won",
      "Lost",
      "Closed",
    ],
    "Follow-up": [
      "Interested",
      "Won",
      "Lost",
      "Closed",
      "Assigned",
    ],
    Interested: [
      "Follow-up",
      "Won",
      "Lost",
      "Closed",
    ],
    Won: [
      "Follow-up",
      "Closed",
    ],
    Lost: [
      "Follow-up",
      "New",
    ],
    Closed: [
      "Follow-up",
      "New",
    ],
  };

  return transitions[currentStatus]?.includes(newStatus) ?? false;
}