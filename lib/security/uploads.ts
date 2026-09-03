const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const documentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const maxImageUploadBytes = 5 * 1024 * 1024;
export const maxDocumentUploadBytes = 10 * 1024 * 1024;

export function sanitizeStorageFileName(fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return sanitized || "upload";
}

export function validateImageUpload(file: File) {
  if (!imageTypes.has(file.type)) return "Upload a JPG, PNG, or WebP image.";
  if (file.size > maxImageUploadBytes) return "Image uploads must be 5 MB or smaller.";
  if (file.size === 0) return "The image file is empty.";
  if (file.name.length > 160 || /[\u0000-\u001f\u007f]/.test(file.name)) return "The image filename is invalid.";
  const extension = file.name.toLowerCase().split(".").pop();
  const matchesType = file.type === "image/jpeg" ? extension === "jpg" || extension === "jpeg" : file.type === "image/png" ? extension === "png" : extension === "webp";
  if (!matchesType) return "The image extension does not match its file type.";
  return null;
}

export function validateDocumentUpload(file: File) {
  if (!documentTypes.has(file.type)) return "Upload a PDF, JPG, PNG, or WebP document.";
  if (file.size > maxDocumentUploadBytes) return "Document uploads must be 10 MB or smaller.";
  return null;
}
