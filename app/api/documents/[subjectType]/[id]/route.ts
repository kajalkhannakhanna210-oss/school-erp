import { NextResponse, type NextRequest } from "next/server";
import { canManageDocument, getDocumentActor, getDocumentCategory, getManagedDocument } from "@/lib/documents";
import { isDocumentStatus, isDocumentSubjectType, isSameOriginMutation, isUuid, parseOptionalDate, sanitizeDocumentText } from "@/lib/security/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, { params }: { params: { subjectType: string; id: string } }) {
  if (!isSameOriginMutation(request)) return error("Invalid request.", 403);
  if (!isDocumentSubjectType(params.subjectType) || !isUuid(params.id)) return error("Document not available.", 404);
  const actor = await getDocumentActor();
  if (!actor) return error("Not authenticated.", 401);
  const document = await getManagedDocument(params.subjectType, params.id);
  if (!document?.category || !canManageDocument(actor, params.subjectType, document.category)) return error("Document not available.", 404);

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return error("Invalid document details.", 400); }
  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "title")) {
    const title = sanitizeDocumentText(body.title, 180);
    if (!title) return error("A document title is required.", 400);
    update.title = title;
  }
  if (Object.hasOwn(body, "description")) update.description = sanitizeDocumentText(body.description, 2000) || null;
  if (Object.hasOwn(body, "status")) {
    if (!isDocumentStatus(body.status)) return error("Invalid document status.", 400);
    update.status = body.status;
  }
  if (Object.hasOwn(body, "expiryDate")) {
    const expiry = parseOptionalDate(body.expiryDate);
    if ("error" in expiry) return error(expiry.error, 400);
    update.expiry_date = expiry.value;
  }
  if (Object.hasOwn(body, "categoryId")) {
    if (!isUuid(body.categoryId)) return error("Invalid document category.", 400);
    const category = await getDocumentCategory(body.categoryId, params.subjectType);
    if (!category?.is_active || !canManageDocument(actor, params.subjectType, category)) return error("You cannot use this document category.", 403);
    update.category_id = category.id;
  }
  if (!Object.keys(update).length) return error("No document changes were provided.", 400);

  const table = params.subjectType === "student" ? "student_documents" : "staff_documents";
  const supabase = await createClient();
  const { error: updateError } = await supabase.from(table).update(update).eq("id", params.id);
  if (updateError) return error("The document could not be updated.", 400);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { subjectType: string; id: string } }) {
  if (!isSameOriginMutation(request)) return error("Invalid request.", 403);
  if (!isDocumentSubjectType(params.subjectType) || !isUuid(params.id)) return error("Document not available.", 404);
  const actor = await getDocumentActor();
  if (!actor || actor.role !== "super_admin") return error("Only a Super Admin can delete documents.", 403);
  const document = await getManagedDocument(params.subjectType, params.id);
  if (!document) return error("Document not available.", 404);
  const table = params.subjectType === "student" ? "student_documents" : "staff_documents";
  const bucket = params.subjectType === "student" ? "student-documents" : "staff-documents";
  const supabase = await createClient();
  const { error: deleteError } = await supabase.from(table).delete().eq("id", params.id);
  if (deleteError) return error("The document could not be deleted.", 400);
  await createAdminClient().storage.from(bucket).remove([document.filePath]);
  return NextResponse.json({ ok: true });
}
