import { NextResponse, type NextRequest } from "next/server";
import { appendDocumentActivity, canViewDocument, getDocumentActor, getManagedDocument } from "@/lib/documents";
import { isDocumentSubjectType, isPreviewableDocumentType, isUuid, safeDownloadName } from "@/lib/security/documents";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { subjectType: string; id: string } }) {
  if (!isDocumentSubjectType(params.subjectType) || !isUuid(params.id)) {
    return NextResponse.json({ error: "Document not available." }, { status: 404 });
  }
  const actor = await getDocumentActor();
  if (!actor) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const document = await getManagedDocument(params.subjectType, params.id);
  if (!document?.category || !canViewDocument(actor, params.subjectType, document.subjectId, document.category, document.status)) {
    return NextResponse.json({ error: "Document not available." }, { status: 404 });
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1" || !isPreviewableDocumentType(document.fileType);
  const bucket = params.subjectType === "student" ? "student-documents" : "staff-documents";
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(document.filePath, 60, {
    download: wantsDownload ? safeDownloadName(document.originalFileName) : false,
  });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Document not available." }, { status: 404 });

  await appendDocumentActivity({
    subjectType: params.subjectType,
    documentId: document.id,
    subjectId: document.subjectId,
    categoryId: document.categoryId,
    action: wantsDownload ? "downloaded" : "viewed",
    actor,
  });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
