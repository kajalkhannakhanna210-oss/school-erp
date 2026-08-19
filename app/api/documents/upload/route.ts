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
import { sanitizeStorageFileName } from "@/lib/security/uploads";
import { checkRateLimitKey } from "@/lib/security/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/require-role";

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

  const isDesignUpload = form.get("designUpload") === "true";
  const isFinalize = form.get("finalizeDesign") === "true";

  if (isDesignUpload) {
    // Special-case: handle ID card design uploads. Stores files in 'id-card-designs' bucket and
    // returns metadata without inserting into documents tables.
    const files = form.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
    if (!files.length || files.length > 2) return error("Upload one or two files (front/back).", 400);

    const admin = createAdminClient();
    const settings = { allowedFileTypes: ["pdf", "jpg", "jpeg", "png", "webp"], maxFileSizeBytes: 10 * 1024 * 1024 };
    const saved: { id: string; originalFileName: string; filePath: string }[] = [];

    for (const file of files) {
      const validation = await validateDocumentFile(file, settings.allowedFileTypes, settings.maxFileSizeBytes);
      if ("error" in validation) return error(validation.error, 400);
      const doc = validation.value;
      const designId = randomUUID();
      const safeName = sanitizeStorageFileName(doc.originalFileName || doc.storedFileName);
      const filePath = `id-card-designs/${designId}/${doc.storedFileName}`;
      const { error: storageError } = await admin.storage.from("id-card-designs").upload(filePath, doc.bytes, {
        contentType: doc.mimeType,
        cacheControl: "private, max-age=0",
        upsert: false,
      });
      if (storageError) return error("The file could not be stored. Please try again.", 500);
      saved.push({ id: designId, originalFileName: safeName, filePath });
    }

    return NextResponse.json({ designs: saved }, { status: 201 });
  }

  if (isFinalize) {
    // Finalize design: expects a JSON payload in form field 'finalizeData'
    const finalizeJson = form.get("finalizeData");
    if (!finalizeJson || typeof finalizeJson !== "string") return error("Missing finalization data.", 400);
    let payload: any;
    try {
      payload = JSON.parse(finalizeJson);
    } catch (e) {
      return error("Invalid finalization payload.", 400);
    }

    // Require admin/page access and get user
    let userId: string | null = null;
    try {
      const { user } = await requirePageAccess("student_id_cards");
      userId = user?.id ?? null;
    } catch (e) {
      return error("Not authorized.", 403);
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      name,
      front_file_path,
      back_file_path,
      orientation = "portrait",
      width_mm = null,
      height_mm = null,
      options = {},
      set_as_default = false,
      is_active = true,
    } = payload;

    if (!name || !front_file_path) return error("A template name and front design are required.", 400);

    // Validate that files exist in storage by attempting to create a short signed URL
    const normalizePath = (p: string) => p.startsWith("id-card-designs/") ? p.replace(/^id-card-designs\//, "") : p;
    try {
      const frontPath = normalizePath(String(front_file_path));
      // @ts-ignore
      const { data: fData, error: fErr } = await admin.storage.from("id-card-designs").createSignedUrl(frontPath, 60);
      if (fErr || !fData?.signedUrl) return error("Front design file not found in storage.", 400);
      if (back_file_path) {
        const backPath = normalizePath(String(back_file_path));
        // @ts-ignore
        const { data: bData, error: bErr } = await admin.storage.from("id-card-designs").createSignedUrl(backPath, 60);
        if (bErr || !bData?.signedUrl) return error("Back design file not found in storage.", 400);
      }
    } catch (e: any) {
      return error(`Design file validation failed: ${String(e?.message || e)}`, 500);
    }

    // Insert template
    const insertRecord: any = {
      name: String(name).slice(0, 180),
      orientation: orientation === "landscape" ? "landscape" : "portrait",
      width_mm: width_mm != null ? Number(width_mm) : null,
      height_mm: height_mm != null ? Number(height_mm) : null,
      options: { ...(options || {}), front_file_path, back_file_path },
      is_active: !!is_active,
      status: "finalized",
      created_by: userId,
    };

    const { data: createdTpl, error: insertErr } = await supabase.from("student_id_card_templates").insert(insertRecord).select("id").single();
    if (insertErr) return error(`Failed to save template: ${insertErr.message}`, 500);

    // Handle default flag
    if (set_as_default) {
      // Clear previous default(s)
      await supabase.from("student_id_card_templates").update({ is_default: false }).eq("is_default", true);
      await supabase.from("student_id_card_templates").update({ is_default: true }).eq("id", createdTpl.id);
    }

    return NextResponse.json({ template: { id: createdTpl.id } }, { status: 201 });
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
