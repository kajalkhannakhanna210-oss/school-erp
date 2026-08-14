import assert from "node:assert/strict";
import test from "node:test";
import { parseOptionalDate, sanitizeOriginalFileName, validateDocumentFile } from "../lib/security/documents";

const allowed = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];

test("document validation requires a matching file signature and safe extension", async () => {
  const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])], "report.pdf", { type: "application/pdf" });
  const valid = await validateDocumentFile(pdf, allowed, 10 * 1024 * 1024);
  assert.ok("value" in valid);
  if ("value" in valid) assert.equal(valid.value.mimeType, "application/pdf");

  const disguisedScript = new File(["console.log('not a PDF')"], "report.pdf", { type: "application/pdf" });
  const rejected = await validateDocumentFile(disguisedScript, allowed, 10 * 1024 * 1024);
  assert.deepEqual(rejected, { error: "The file contents do not match an allowed document format." });
});

test("document validation sanitizes display names and blocks unapproved extensions", async () => {
  assert.equal(sanitizeOriginalFileName("..\\unsafe\u0000name.pdf"), "..-unsafe-name.pdf");
  const executable = new File([new Uint8Array([0x4d, 0x5a])], "payload.exe", { type: "application/octet-stream" });
  const rejected = await validateDocumentFile(executable, allowed, 10 * 1024 * 1024);
  assert.deepEqual(rejected, { error: "This file type is not allowed." });
});

test("expiry dates reject calendar rollovers", () => {
  assert.deepEqual(parseOptionalDate("2026-02-29"), { error: "Use a valid expiry date." });
  assert.deepEqual(parseOptionalDate("2028-02-29"), { value: "2028-02-29" });
});
