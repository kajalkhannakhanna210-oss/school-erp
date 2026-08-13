import test from "node:test";
import assert from "node:assert/strict";
import {
  isHoneypotFilled,
  normalizedContentHash,
  normalizeText,
  validateAdmissionPayload,
  validateContactPayload,
} from "../lib/security/public-forms-core";
import { handleAdmissionSubmission, handleContactSubmission } from "../lib/security/public-form-handlers";

function makeRequest(url = "https://school.example.com/contact", body: unknown = {}, origin = "https://school.example.com") {
  const parsed = new URL(url);
  return {
    headers: new Headers({ "content-type": "application/json", origin }),
    nextUrl: { origin: parsed.origin },
    async json() {
      return body;
    },
  } as any;
}

function makeContactAdmin({
  emailMatches = [],
  contentMatches = [],
  insertError = null,
}: {
  emailMatches?: unknown[];
  contentMatches?: unknown[];
  insertError?: { code: string } | null;
}) {
  let queryIndex = 0;
  return {
    from() {
      const current = queryIndex++;
      return {
        select() { return this; },
        eq() { return this; },
        gte() { return this; },
        limit() {
          const data = current === 0 ? emailMatches : contentMatches;
          return Promise.resolve({ data, error: null });
        },
        insert() {
          return Promise.resolve({ error: insertError });
        },
      };
    },
  } as any;
}

test("normalizeText collapses control characters and whitespace", () => {
  assert.equal(normalizeText("  Alice\t\nSmith \u0000 "), "Alice Smith");
});

test("validateContactPayload accepts a normal submission", () => {
  const result = validateContactPayload({
    name: "Asha Kumar",
    email: "asha.kumar@example.com",
    phone: "9876543210",
    message: "Please share the admission timeline and fee structure.",
    captchaToken: "token",
    website: "",
  });

  assert.ok("input" in result);
  assert.equal(result.input.email, "asha.kumar@example.com");
});

test("validateContactPayload rejects unexpected fields", () => {
  const result = validateContactPayload({
    name: "Asha Kumar",
    email: "asha.kumar@example.com",
    phone: "9876543210",
    message: "Please share the admission timeline and fee structure.",
    captchaToken: "token",
    website: "",
    admin: true,
  });

  assert.ok("error" in result);
  assert.equal(result.error, "Invalid request.");
});

test("validateContactPayload rejects invalid email and long messages", () => {
  const invalidEmail = validateContactPayload({
    name: "Asha Kumar",
    email: "not-an-email",
    phone: "9876543210",
    message: "Please share the admission timeline and fee structure.",
    captchaToken: "token",
    website: "",
  });
  const longMessage = validateContactPayload({
    name: "Asha Kumar",
    email: "asha.kumar@example.com",
    phone: "9876543210",
    message: "a".repeat(2001),
    captchaToken: "token",
    website: "",
  });

  assert.ok("error" in invalidEmail);
  assert.ok("error" in longMessage);
});

test("validateAdmissionPayload accepts a normal submission", () => {
  const result = validateAdmissionPayload({
    student_name: "Riya Sharma",
    date_of_birth: "2014-05-02",
    applying_for: "Class 5",
    parent_name: "Sanjay Sharma",
    parent_email: "sanjay.sharma@example.com",
    phone: "9876543210",
    address: "12 MG Road, New Delhi, India",
    captchaToken: "token",
    website: "",
  });

  assert.ok("input" in result);
  assert.equal(result.input.phone, "9876543210");
});

test("isHoneypotFilled flags spam-trap content and validateAdmissionPayload rejects invalid date", () => {
  const honeypot = isHoneypotFilled("spam");
  const invalidDate = validateAdmissionPayload({
    student_name: "Riya Sharma",
    date_of_birth: "2030-05-02",
    applying_for: "Class 5",
    parent_name: "Sanjay Sharma",
    parent_email: "sanjay.sharma@example.com",
    phone: "9876543210",
    address: "12 MG Road, New Delhi, India",
    captchaToken: "token",
    website: "",
  });

  assert.equal(honeypot, true);
  assert.ok("error" in invalidDate);
});

test("normalizedContentHash is stable for normalized values", () => {
  const a = normalizedContentHash(["  Asha  ", "Example@Email.com"]);
  const b = normalizedContentHash(["Asha", "example@email.com"]);
  assert.equal(a, b);
});

test("contact handler rejects cross-origin requests", async () => {
  const response = await handleContactSubmission({
    request: makeRequest("https://school.example.com/api/contact", {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    }, "https://evil.example.com"),
    body: {},
    createAdminClient: () => makeContactAdmin({}),
    logSecurityEvent: async () => {},
  });

  assert.equal(response.status, 403);
});

test("contact handler returns 429 when rate limited", async () => {
  const response = await handleContactSubmission({
    request: makeRequest("https://school.example.com/api/contact", {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    }),
    body: {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    },
    createAdminClient: () => makeContactAdmin({}),
    logSecurityEvent: async () => {},
    rateLimit: async () => ({ allowed: false, retryAfterSeconds: 600 }),
    verifyCaptcha: async () => ({ ok: true }),
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "600");
});

test("contact handler rejects duplicate submissions", async () => {
  const response = await handleContactSubmission({
    request: makeRequest("https://school.example.com/api/contact", {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    }),
    body: {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    },
    createAdminClient: () =>
      makeContactAdmin({
        emailMatches: [{ content_hash: normalizedContentHash(["Asha Kumar", "asha.kumar@example.com", "9876543210", "Please share the admission timeline and fee structure."]) }],
      }),
    logSecurityEvent: async () => {},
    rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    verifyCaptcha: async () => ({ ok: true }),
  });

  assert.equal(response.status, 409);
});

test("contact handler accepts a normal submission", async () => {
  const response = await handleContactSubmission({
    request: makeRequest("https://school.example.com/api/contact", {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    }),
    body: {
      name: "Asha Kumar",
      email: "asha.kumar@example.com",
      phone: "9876543210",
      message: "Please share the admission timeline and fee structure.",
      captchaToken: "token",
      website: "",
    },
    createAdminClient: () => makeContactAdmin({}),
    logSecurityEvent: async () => {},
    rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    verifyCaptcha: async () => ({ ok: true }),
  });

  assert.equal(response.status, 200);
});

test("admission handler rejects unauthenticated requests", async () => {
  const response = await handleAdmissionSubmission({
    request: makeRequest("https://school.example.com/api/admissions", {
      student_name: "Riya Sharma",
      date_of_birth: "2014-05-02",
      applying_for: "Class 5",
      parent_name: "Sanjay Sharma",
      parent_email: "sanjay.sharma@example.com",
      phone: "9876543210",
      address: "12 MG Road, New Delhi, India",
      captchaToken: "token",
      website: "",
    }),
    body: {
      student_name: "Riya Sharma",
      date_of_birth: "2014-05-02",
      applying_for: "Class 5",
      parent_name: "Sanjay Sharma",
      parent_email: "sanjay.sharma@example.com",
      phone: "9876543210",
      address: "12 MG Road, New Delhi, India",
      captchaToken: "token",
      website: "",
    },
    createAdminClient: () => makeContactAdmin({}),
    createAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    logSecurityEvent: async () => {},
    rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    verifyCaptcha: async () => ({ ok: true }),
  });

  assert.equal(response.status, 401);
});

test("admission handler accepts a normal submission", async () => {
  const response = await handleAdmissionSubmission({
    request: makeRequest("https://school.example.com/api/admissions", {
      student_name: "Riya Sharma",
      date_of_birth: "2014-05-02",
      applying_for: "Class 5",
      parent_name: "Sanjay Sharma",
      parent_email: "sanjay.sharma@example.com",
      phone: "9876543210",
      address: "12 MG Road, New Delhi, India",
      captchaToken: "token",
      website: "",
    }),
    body: {
      student_name: "Riya Sharma",
      date_of_birth: "2014-05-02",
      applying_for: "Class 5",
      parent_name: "Sanjay Sharma",
      parent_email: "sanjay.sharma@example.com",
      phone: "9876543210",
      address: "12 MG Road, New Delhi, India",
      captchaToken: "token",
      website: "",
    },
    createAdminClient: () => makeContactAdmin({}),
    createAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) } }),
    logSecurityEvent: async () => {},
    rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    verifyCaptcha: async () => ({ ok: true }),
  });

  assert.equal(response.status, 200);
});
