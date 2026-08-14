import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  createSuperAdminSessionToken,
  validateSuperAdminSessionToken,
} from "../lib/security/super-admin-session";

const secret = "test-secret";
const now = Date.UTC(2026, 7, 14, 12, 0, 0);

test("a signed super-admin session is valid for exactly 24 hours", async () => {
  const token = await createSuperAdminSessionToken("admin-1", secret, now);

  assert.equal(await validateSuperAdminSessionToken(token, "admin-1", secret, now + SUPER_ADMIN_SESSION_MAX_AGE_SECONDS * 1000 - 1), "valid");
  assert.equal(await validateSuperAdminSessionToken(token, "admin-1", secret, now + SUPER_ADMIN_SESSION_MAX_AGE_SECONDS * 1000), "expired");
});

test("a super-admin session cannot be used by another account or after tampering", async () => {
  const token = await createSuperAdminSessionToken("admin-1", secret, now);

  assert.equal(await validateSuperAdminSessionToken(token, "admin-2", secret, now), "invalid");
  assert.equal(await validateSuperAdminSessionToken(`${token}x`, "admin-1", secret, now), "invalid");
});
