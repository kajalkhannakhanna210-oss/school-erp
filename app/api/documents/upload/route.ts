import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  canManageDocument,
  getDocumentActor,
  getDocumentCategory,
  getDocumentSettings,
  getManagedDocument,
  subjectExists,
} from "@/lib/documents";
import {
  isDocumentStatus,
  isDocumentSubjectType,
  isSameOriginMutation,
  isUuid,
  parseOptionalDate,
  sanitizeDocumentText,
  validateDocumentFile,
} from "@/lib/security/documents";
import { checkRateLimitKey } from "@/lib/security/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return error("Invalid request.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Invalid upload request.", 400);
  }

  const subjectTypeValue = form.get("subjectType");
  const subjectId = form.get("subjectId");
  const categoryId = form.get("categoryId");
  const replacementId = form.get("supersedesDocumentId");
  if (!isDocumentSubjectType(subjectTypeValue) || !isUuid(subjectId) || !isUuid(categoryId)) {
    return error("Invalid document target.", 400);
  }
  if (replacementId && !isUuid(replacementId)) return error("Invalid replacement document.", 400);

  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length || files.length > 5) return error("Upload between one and five files at a time.", 400);
  if (replacementId && files.length !== 1) return error("A replacement must contain one file.", 400);

  const actor = await getDocumentActor();
  if (!actor) return error("Not authenticated.", 401);

  const rateLimit = await checkRateLimitKey({
    action: "document_upload",
    scope: `${actor.userId}:${subjectId}`,
    limit: 20,
    windowSeconds: 5 * 60,
    blockSeconds: 5 * 60,
    failOpen: false,
  });
  if (!rateLimit.allowed) {
    return error("Too many uploads. Please try again later.", 429);
  }

  const [category, exists, settings] = await Promise.all([
    getDocumentCategory(categoryId, subjectTypeValue),
    subjectExists(subjectTypeValue, subjectId),
    getDocumentSettings(),
  ]);
  if (!category?.is_active || !exists) return error("The selected document target is unavailable.", 404);
  if (!canManageDocument(actor, subjectTypeValue, category)) return error("You are not authorized to upload this document.", 403);

  let supersededDocument = null;
  if (replacementId) {
    supersededDocument = await getManagedDocument(subjectTypeValue, replacementId);
    if (!supersededDocument || supersededDocument.subjectId !== subjectId || supersededDocument.categoryId !== categoryId) {
      return error("The document to replace is unavailable.", 404);
    }
    if (!supersededDocument.category || !canManageDocument(actor, subjectTypeValue, supersededDocument.category)) {
      return error("You are not authorized to replace this document.", 403);
    }
  }

  const expiry = parseOptionalDate(form.get("expiryDate"));
  if ("error" in expiry) return error(expiry.error, 400);
  const requestedStatus = form.get("status");
  const status = isDocumentStatus(requestedStatus) ? requestedStatus : "pending_review";
  const suppliedTitle = sanitizeDocumentText(form.get("title"), 180);
  const descriptionValue = sanitizeDocumentText(form.get("description"), 2000);
  const admin = createAdminClient();
  const supabase = await createClient();
  const table = subjectTypeValue === "student" ? "student_documents" : "staff_documents";
  const bucket = subjectTypeValue === "student" ? "student-documents" : "staff-documents";
  const saved: { id: string; title: string }[] = [];

  for (const file of files) {
    const validation = await validateDocumentFile(file, settings.allowedFileTypes, settings.maxFileSizeBytes);
    if ("error" in validation) return error(validation.error, 400);
    const documentFile = validation.value;

    const duplicateQuery = admin
      .from(table)
      .select("id")
      .eq(subjectTypeValue === "student" ? "student_id" : "staff_id", subjectId)
      .eq("category_id", categoryId)
      .eq("file_sha256", documentFile.sha256)
      .neq("status", "archived")
      .limit(1);
    const { data: duplicates } = await duplicateQuery;
    if (duplicates?.length) return error("An identical active document already exists for this category.", 409);

    const documentId = randomUUID();
    const filePath = `${subjectId}/${documentId}/${documentFile.storedFileName}`;
    const { error: storageError } = await admin.storage.from(bucket).upload(filePath, documentFile.bytes, {
      contentType: documentFile.mimeType,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
    if (storageError) return error("The file could not be stored. Please try again.", 500);

    const record = {
      id: documentId,
      category_id: categoryId,
      title: suppliedTitle || documentFile.originalFileName,
      description: descriptionValue || null,
      original_file_name: documentFile.originalFileName,
      stored_file_name: documentFile.storedFileName,
      file_path: filePath,
      file_type: documentFile.mimeType,
      file_size_bytes: documentFile.fileSizeBytes,
      file_sha256: documentFile.sha256,
      status,
      expiry_date: expiry.value,
      ...(supersededDocument ? { supersedes_document_id: supersededDocument.id } : {}),
    };
    const { error: insertError } = subjectTypeValue === "student"
      ? await supabase.from("student_documents").insert({ ...record, student_id: subjectId, file_name: documentFile.originalFileName })
      : await supabase.from("staff_documents").insert({ ...record, staff_id: subjectId });
    if (insertError) {
      await admin.storage.from(bucket).remove([filePath]);
      return error("The document record could not be saved.", 500);
    }
    saved.push({ id: documentId, title: record.title });
  }

  return NextResponse.json({ documents: saved }, { status: 201 });
}
