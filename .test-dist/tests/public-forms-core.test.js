"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const public_forms_core_1 = require("../lib/security/public-forms-core");
const public_form_handlers_1 = require("../lib/security/public-form-handlers");
function makeRequest(url = "https://school.example.com/contact", body = {}, origin = "https://school.example.com") {
    const parsed = new URL(url);
    return {
        headers: new Headers({ "content-type": "application/json", origin }),
        nextUrl: { origin: parsed.origin },
        async json() {
            return body;
        },
    };
}
function makeContactAdmin({ emailMatches = [], contentMatches = [], insertError = null, }) {
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
    };
}
(0, node_test_1.default)("normalizeText collapses control characters and whitespace", () => {
    strict_1.default.equal((0, public_forms_core_1.normalizeText)("  Alice\t\nSmith \u0000 "), "Alice Smith");
});
(0, node_test_1.default)("validateContactPayload accepts a normal submission", () => {
    const result = (0, public_forms_core_1.validateContactPayload)({
        name: "Asha Kumar",
        email: "asha.kumar@example.com",
        phone: "9876543210",
        message: "Please share the admission timeline and fee structure.",
        captchaToken: "token",
        website: "",
    });
    strict_1.default.ok("input" in result);
    strict_1.default.equal(result.input.email, "asha.kumar@example.com");
});
(0, node_test_1.default)("validateContactPayload rejects unexpected fields", () => {
    const result = (0, public_forms_core_1.validateContactPayload)({
        name: "Asha Kumar",
        email: "asha.kumar@example.com",
        phone: "9876543210",
        message: "Please share the admission timeline and fee structure.",
        captchaToken: "token",
        website: "",
        admin: true,
    });
    strict_1.default.ok("error" in result);
    strict_1.default.equal(result.error, "Invalid request.");
});
(0, node_test_1.default)("validateContactPayload rejects invalid email and long messages", () => {
    const invalidEmail = (0, public_forms_core_1.validateContactPayload)({
        name: "Asha Kumar",
        email: "not-an-email",
        phone: "9876543210",
        message: "Please share the admission timeline and fee structure.",
        captchaToken: "token",
        website: "",
    });
    const longMessage = (0, public_forms_core_1.validateContactPayload)({
        name: "Asha Kumar",
        email: "asha.kumar@example.com",
        phone: "9876543210",
        message: "a".repeat(2001),
        captchaToken: "token",
        website: "",
    });
    strict_1.default.ok("error" in invalidEmail);
    strict_1.default.ok("error" in longMessage);
});
(0, node_test_1.default)("validateAdmissionPayload accepts a normal submission", () => {
    const result = (0, public_forms_core_1.validateAdmissionPayload)({
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
    strict_1.default.ok("input" in result);
    strict_1.default.equal(result.input.phone, "9876543210");
});
(0, node_test_1.default)("isHoneypotFilled flags spam-trap content and validateAdmissionPayload rejects invalid date", () => {
    const honeypot = (0, public_forms_core_1.isHoneypotFilled)("spam");
    const invalidDate = (0, public_forms_core_1.validateAdmissionPayload)({
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
    strict_1.default.equal(honeypot, true);
    strict_1.default.ok("error" in invalidDate);
});
(0, node_test_1.default)("normalizedContentHash is stable for normalized values", () => {
    const a = (0, public_forms_core_1.normalizedContentHash)(["  Asha  ", "Example@Email.com"]);
    const b = (0, public_forms_core_1.normalizedContentHash)(["Asha", "example@email.com"]);
    strict_1.default.equal(a, b);
});
(0, node_test_1.default)("contact handler rejects cross-origin requests", async () => {
    const response = await (0, public_form_handlers_1.handleContactSubmission)({
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
        logSecurityEvent: async () => { },
    });
    strict_1.default.equal(response.status, 403);
});
(0, node_test_1.default)("contact handler returns 429 when rate limited", async () => {
    const response = await (0, public_form_handlers_1.handleContactSubmission)({
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
        logSecurityEvent: async () => { },
        rateLimit: async () => ({ allowed: false, retryAfterSeconds: 600 }),
        verifyCaptcha: async () => ({ ok: true }),
    });
    strict_1.default.equal(response.status, 429);
    strict_1.default.equal(response.headers.get("Retry-After"), "600");
});
(0, node_test_1.default)("contact handler rejects duplicate submissions", async () => {
    const response = await (0, public_form_handlers_1.handleContactSubmission)({
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
        createAdminClient: () => makeContactAdmin({
            emailMatches: [{ content_hash: (0, public_forms_core_1.normalizedContentHash)(["Asha Kumar", "asha.kumar@example.com", "9876543210", "Please share the admission timeline and fee structure."]) }],
        }),
        logSecurityEvent: async () => { },
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        verifyCaptcha: async () => ({ ok: true }),
    });
    strict_1.default.equal(response.status, 409);
});
(0, node_test_1.default)("contact handler accepts a normal submission", async () => {
    const response = await (0, public_form_handlers_1.handleContactSubmission)({
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
        logSecurityEvent: async () => { },
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        verifyCaptcha: async () => ({ ok: true }),
    });
    strict_1.default.equal(response.status, 200);
});
(0, node_test_1.default)("admission handler rejects unauthenticated requests", async () => {
    const response = await (0, public_form_handlers_1.handleAdmissionSubmission)({
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
        logSecurityEvent: async () => { },
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        verifyCaptcha: async () => ({ ok: true }),
    });
    strict_1.default.equal(response.status, 401);
});
(0, node_test_1.default)("admission handler accepts a normal submission", async () => {
    const response = await (0, public_form_handlers_1.handleAdmissionSubmission)({
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
        logSecurityEvent: async () => { },
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        verifyCaptcha: async () => ({ ok: true }),
    });
    strict_1.default.equal(response.status, 200);
});
