import { createHash, randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export const DOCUMENT_SUBJECT_TYPES = ["student", "staff"] as const;
export const DOCUMENT_STATUSES = ["active", "pending_review", "approved", "rejected", "expired", "archived"] as const;
export const DOCUMENT_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"] as const;

export type DocumentSubjectType = (typeof DOCUMENT_SUBJECT_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type DocumentFileType = (typeof DOCUMENT_FILE_TYPES)[number];

export type ValidatedDocumentFile = {
  bytes: Uint8Array;
  fileType: DocumentFileType;
  mimeType: string;
  originalFileName: string;
  storedFileName: string;
  fileSizeBytes: number;
  sha256: string;
};

const maxHardFileSizeBytes = 10 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mimeTypes: Record<DocumentFileType, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function isDocumentSubjectType(value: unknown): value is DocumentSubjectType {
  return typeof value === "string" && (DOCUMENT_SUBJECT_TYPES as readonly string[]).includes(value);
}

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return typeof value === "string" && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

export function isDocumentFileType(value: unknown): value is DocumentFileType {
  return typeof value === "string" && (DOCUMENT_FILE_TYPES as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function sanitizeDocumentText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeOriginalFileName(fileName: string) {
  const base = fileName.replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim();
  return (base || "document").slice(0, 180);
}

function fileExtension(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return isDocumentFileType(extension) ? extension : null;
}

function startsWith(bytes: Uint8Array, expected: number[]) {
  return expected.every((byte, index) => bytes[index] === byte);
}

function containsAscii(bytes: Uint8Array, needle: string) {
  const value = Buffer.from(bytes).toString("latin1");
  return value.includes(needle);
}

function detectFileType(bytes: Uint8Array, extension: DocumentFileType | null): DocumentFileType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return extension === "jpg" ? "jpg" : "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";

  const isCompoundOffice = startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (isCompoundOffice && (extension === "doc" || extension === "xls")) return extension;

  const isZip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
  if (isZip && containsAscii(bytes, "[Content_Types].xml")) {
    if (containsAscii(bytes, "word/")) return "docx";
    if (containsAscii(bytes, "xl/")) return "xlsx";
  }
  return null;
}

function browserMimeLooksCompatible(fileType: DocumentFileType, browserMime: string) {
  if (!browserMime) return true;
  if (fileType === "jpg" || fileType === "jpeg") return browserMime === "image/jpeg";
  return browserMime === mimeTypes[fileType] || browserMime === "application/octet-stream";
}

export async function validateDocumentFile(
  file: File,
  allowedTypes: readonly string[],
  configuredMaxSizeBytes: number
): Promise<{ value: ValidatedDocumentFile } | { error: string }> {
  const originalFileName = sanitizeOriginalFileName(file.name);
  const extension = fileExtension(originalFileName);
  const maxSize = Math.min(Math.max(configuredMaxSizeBytes, 1024 * 1024), maxHardFileSizeBytes);

  if (!extension || !allowedTypes.includes(extension)) return { error: "This file type is not allowed." };
  if (!file.size || file.size > maxSize) return { error: `Files must be between 1 byte and ${Math.floor(maxSize / (1024 * 1024))} MB.` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFileType(bytes, extension);
  if (!detected || !allowedTypes.includes(detected) || !browserMimeLooksCompatible(detected, file.type)) {
    return { error: "The file contents do not match an allowed document format." };
  }

  const extensionMatches =
    extension === detected ||
    ((extension === "jpg" || extension === "jpeg") && (detected === "jpg" || detected === "jpeg"));
  if (!extensionMatches) return { error: "The file extension does not match its contents." };

  const storedFileName = `${randomUUID()}.${detected}`;
  return {
    value: {
      bytes,
      fileType: detected,
      mimeType: mimeTypes[detected],
      originalFileName,
      storedFileName,
      fileSizeBytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

export function parseOptionalDate(value: unknown): { value: string | null } | { error: string } {
  if (value == null || value === "") return { value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "Use a valid expiry date." };
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return { error: "Use a valid expiry date." };
  return { value };
}

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !!origin && origin === request.nextUrl.origin;
}

export function isPreviewableDocumentType(fileType: string) {
  return fileType === "application/pdf" || fileType.startsWith("image/");
}

export function safeDownloadName(value: string, fallback = "document") {
  const safe = sanitizeOriginalFileName(value).replace(/["\\]/g, "-");
  return safe || fallback;
}
