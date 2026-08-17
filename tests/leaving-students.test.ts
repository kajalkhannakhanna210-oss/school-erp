import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_TRANSITIONS,
  isValidTransition,
  LEAVING_REASON_LABELS,
  LEAVING_STATUS_LABELS,
  LeavingRequestStatus,
} from "../lib/leaving-students";

test("Leaving Students - Valid Workflow Transitions", () => {
  // Active -> Verification Pending
  assert.equal(isValidTransition("leaving_requested", "verification_pending"), true);
  
  // Verification Pending -> Approved
  assert.equal(isValidTransition("verification_pending", "approved"), true);

  // Approved -> TC Generated
  assert.equal(isValidTransition("approved", "tc_generated"), true);

  // TC Generated -> Student Left
  assert.equal(isValidTransition("tc_generated", "student_left"), true);

  // Rejections & Cancellations
  assert.equal(isValidTransition("leaving_requested", "rejected"), true);
  assert.equal(isValidTransition("verification_pending", "cancelled"), true);
});

test("Leaving Students - Invalid Workflow Transitions", () => {
  // Cannot jump directly from requested to left
  assert.equal(isValidTransition("leaving_requested", "student_left"), false);

  // Cannot jump directly from requested to tc_generated
  assert.equal(isValidTransition("leaving_requested", "tc_generated"), false);

  // Terminal state student_left cannot transition anywhere
  assert.equal(isValidTransition("student_left", "approved"), false);
  assert.equal(isValidTransition("student_left", "leaving_requested"), false);
});

test("Leaving Students - Enum Constants & Labels", () => {
  assert.ok(LEAVING_REASON_LABELS.transfer_to_another_school);
  assert.ok(LEAVING_REASON_LABELS.other);
  assert.ok(LEAVING_STATUS_LABELS.leaving_requested);
  assert.ok(LEAVING_STATUS_LABELS.student_left);
});
