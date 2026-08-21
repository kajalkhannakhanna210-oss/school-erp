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
 * Supports:
 * /api/id-card-designs/preview?file=<path>
 *
 * Also supports legacy paths:
 * /api/id-card-designs/preview?file=id-card-designs/<path>
 */
export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");

  // Validate file parameter
  if (!fileParam) {
    return errorResponse("Missing file parameter.", 400);
  }

  // Prevent path traversal
  if (fileParam.includes("..")) {
    return errorResponse("Invalid file path.", 400);
  }

  // Prevent absolute/local filesystem paths
  if (
    fileParam.startsWith("/") ||
    fileParam.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(fileParam)
  ) {
    return errorResponse("Invalid file path.", 400);
  }

  // Check user permission
  try {
    await requirePageAccess("student_id_cards");
  } catch (error) {
    console.error("ID-card preview authorization failed:", error);

    return errorResponse("Not authorized.", 403);
  }

  // Create Supabase admin client
  let admin;

  try {
    admin = createAdminClient();
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

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
    // Remove leading slashes
    const normalizedPath = fileParam.replace(/^\/+/, "");

    // Support both:
    // filename/path
    // id-card-designs/filename/path
    const bucketPrefix = "id-card-designs/";

    const bucketRelativePath =
      normalizedPath.startsWith(bucketPrefix)
        ? normalizedPath.substring(bucketPrefix.length)
        : normalizedPath;

    // Try both possible paths without duplicates
    const candidates = Array.from(
      new Set([
        normalizedPath,
        bucketRelativePath,
      ])
    ).filter(
      (path): path is string => Boolean(path)
    );

    let lastStorageError: unknown = null;

    // Try each possible storage path
    for (const candidate of candidates) {
      const {
        data,
        error: storageError,
      } = await admin.storage
        .from("id-card-designs")
        .createSignedUrl(candidate, 60);

      // Successfully generated signed URL
      if (!storageError && data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl);
      }

      // Save the last error for logging
      lastStorageError = storageError;
    }

    // Could not generate a signed URL
    console.error(
      "Could not generate ID-card preview URL:",
      lastStorageError
    );

    return errorResponse(
      "Could not generate preview URL.",
      500
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

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