"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/require-role";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_FILE_TYPES, DOCUMENT_SUBJECT_TYPES, type DocumentSubjectType } from "@/lib/security/documents";

const categoryCodePattern = /^[a-z0-9_]{2,80}$/;

type CategoryInput = {
  id?: string;
  subjectType: DocumentSubjectType;
  code: string;
  name: string;
  isActive: boolean;
  isRequired: boolean;
  isSensitive: boolean;
  subjectVisible: boolean;
};

function validateCategory(input: CategoryInput) {
  if (!DOCUMENT_SUBJECT_TYPES.includes(input.subjectType)) return "Invalid document subject.";
  if (!categoryCodePattern.test(input.code)) return "Use a 2–80 character lowercase category code (letters, numbers, and underscores).";
  if (!input.name.trim() || input.name.trim().length > 120) return "Use a category name between 1 and 120 characters.";
  return null;
}

export async function saveDocumentCategory(input: CategoryInput) {
  await requireSuperAdmin();
  const validationError = validateCategory(input);
  if (validationError) return { error: validationError };
  const payload = {
    subject_type: input.subjectType,
    code: input.code,
    name: input.name.trim(),
    is_active: input.isActive,
    is_required: input.isRequired,
    is_sensitive: input.isSensitive,
    subject_visible: input.subjectVisible,
  };
  const supabase = await createClient();
  const result = input.id
    ? await supabase.from("document_categories").update(payload).eq("id", input.id)
    : await supabase.from("document_categories").insert(payload);
  if (result.error) return { error: result.error.message };
  revalidatePath("/documents");
  return { error: null };
}

export async function saveDocumentSettings(input: { maxFileSizeMb: number; allowedFileTypes: string[]; expiryReminderDays: number }) {
  await requireSuperAdmin();
  const maxFileSizeMb = Number(input.maxFileSizeMb);
  const expiryReminderDays = Number(input.expiryReminderDays);
  const allowedFileTypes = [...new Set(input.allowedFileTypes)].filter((type): type is (typeof DOCUMENT_FILE_TYPES)[number] => DOCUMENT_FILE_TYPES.includes(type as (typeof DOCUMENT_FILE_TYPES)[number]));
  if (!Number.isInteger(maxFileSizeMb) || maxFileSizeMb < 1 || maxFileSizeMb > 10) return { error: "Maximum file size must be between 1 and 10 MB." };
  if (!Number.isInteger(expiryReminderDays) || expiryReminderDays < 1 || expiryReminderDays > 365) return { error: "Expiry reminders must be between 1 and 365 days." };
  if (!allowedFileTypes.length) return { error: "Select at least one allowed file type." };
  const supabase = await createClient();
  const { error } = await supabase.from("document_settings").update({
    max_file_size_bytes: maxFileSizeMb * 1024 * 1024,
    allowed_file_types: allowedFileTypes,
    expiry_reminder_days: expiryReminderDays,
  }).eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/documents");
  return { error: null };
}
