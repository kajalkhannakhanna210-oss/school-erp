import test from "node:test";
import assert from "node:assert/strict";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_TYPES,
  FOLLOWUP_TYPES,
  ENQUIRY_SOURCES,
  isValidEnquiryTransition,
} from "../lib/enquiries";

test("Admission Enquiry - Valid Workflow Transitions", () => {
  // New -> Assigned
  assert.equal(isValidEnquiryTransition("New", "Assigned"), true);

  // Assigned -> Follow-up
  assert.equal(isValidEnquiryTransition("Assigned", "Follow-up"), true);

  // Follow-up -> Interested
  assert.equal(isValidEnquiryTransition("Follow-up", "Interested"), true);

  // Interested -> Won
  assert.equal(isValidEnquiryTransition("Interested", "Won"), true);

  // Interested -> Lost
  assert.equal(isValidEnquiryTransition("Interested", "Lost"), true);

  // New -> Closed
  assert.equal(isValidEnquiryTransition("New", "Closed"), true);
});

test("Admission Enquiry - Invalid Workflow Transitions", () => {
  // Won cannot transition back to New directly
  assert.equal(isValidEnquiryTransition("Won", "New"), false);

  // Won cannot transition back to Assigned directly
  assert.equal(isValidEnquiryTransition("Won", "Assigned"), false);
});

test("Admission Enquiry - Constants & Enums", () => {
  assert.ok(ENQUIRY_STATUSES.includes("New"));
  assert.ok(ENQUIRY_STATUSES.includes("Won"));
  assert.ok(ENQUIRY_STATUSES.includes("Lost"));

  assert.ok(ENQUIRY_TYPES.includes("Online"));
  assert.ok(ENQUIRY_TYPES.includes("Offline"));

  assert.ok(FOLLOWUP_TYPES.includes("Phone"));
  assert.ok(FOLLOWUP_TYPES.includes("WhatsApp"));
  assert.ok(FOLLOWUP_TYPES.includes("Visit"));

  assert.ok(ENQUIRY_SOURCES.includes("Walk-in"));
  assert.ok(ENQUIRY_SOURCES.includes("Website"));
  assert.ok(ENQUIRY_SOURCES.includes("Referral"));
});
