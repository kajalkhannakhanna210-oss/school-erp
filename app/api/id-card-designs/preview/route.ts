import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageAccess } from "@/lib/require-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a standard JSON error response.
 */
function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Preview an ID-card design stored in the private
 * "id-card-designs" Supabase Storage bucket.
 *
 * Supports both:
 *   /api/id-card-designs/preview?file=<path>
 *
 * and legacy paths:
 *   /api/id-card-designs/preview?file=id-card-designs/<path>
 */
export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");

  // --------------------------------------------------
  // Validate file parameter
  // --------------------------------------------------
  if (!fileParam) {
    return errorResponse("Missing file parameter.", 400);
  }

  // Prevent path traversal.
  if (fileParam.includes("..")) {
    return errorResponse("Invalid file path.", 400);
  }

  // Prevent absolute/local filesystem paths.
  if (
    fileParam.startsWith("/") ||
    fileParam.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(fileParam)
  ) {
    return errorResponse("Invalid file path.", 400);
  }

  // --------------------------------------------------
  // Check user permission
  // --------------------------------------------------
  try {
    await requirePageAccess("student_id_cards");
  } catch {
    return errorResponse("Not authorized.", 403);
  }

  // --------------------------------------------------
  // Create Supabase admin client
  // --------------------------------------------------
  let admin;

  try {
    admin = createAdminClient();
  } catch (e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : String(e);

    console.error(
      "Failed to create Supabase admin client:",
      message
    );

    return errorResponse(
      "Unable to connect to storage service.",
      500
    );
  }

  try {
    // --------------------------------------------------
    // Support both current and legacy storage paths
    // --------------------------------------------------

    const normalizedPath = fileParam.replace(
      /^\/+/,
      ""
    );

    const bucketPrefix = "id-card-designs/";

    const bucketRelativePath =
      normalizedPath.startsWith(bucketPrefix)
        ? normalizedPath.substring(bucketPrefix.length)
        : normalizedPath;

    const candidates = Array.from(
      new Set([
        normalizedPath,
        bucketRelativePath,
      ])
    ).filter(Boolean);

    // --------------------------------------------------
    // Try each possible storage path
    // --------------------------------------------------

    let lastStorageError: unknown = null;

    for (const candidate of candidates) {
      const {
        data,
        error: storageError,
      } = await admin.storage
        .from("id-card-designs")
        .createSignedUrl(candidate, 60);

      if (!storageError && data?.signedUrl) {
        return NextResponse.redirect(
          data.signedUrl
        );
      }

      lastStorageError = storageError;
    }

    // --------------------------------------------------
    // Signed URL could not be generated
    // --------------------------------------------------

    console.error(
      "Could not generate ID-card preview URL:",
      lastStorageError
    );

    return errorResponse(
      "Could not generate preview URL.",
      500
    );
  } catch (e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : String(e);

    console.error(
      "ID-card preview request failed:",
      message
    );

    return errorResponse(
      `Preview failed: ${message}`,
      500
    );
  }
}