"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleContactSubmission = handleContactSubmission;
exports.handleAdmissionSubmission = handleAdmissionSubmission;
const server_1 = require("next/server");
const public_forms_1 = require("./public-forms");
const duplicateWindowMinutes = 30;
function jsonError(error, status, retryAfterSeconds) {
    return server_1.NextResponse.json({ error }, {
        status,
        headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
    });
}
async function handleContactLikeSubmission(formName, deps, validate, buildInsert) {
    if (!(0, public_forms_1.isSameOriginRequest)(deps.request))
        return jsonError("Invalid request.", 403);
    if (!deps.request.headers.get("content-type")?.toLowerCase().includes("application/json"))
        return jsonError("Invalid request.", 415);
    const validation = validate(deps.body);
    if ("error" in validation)
        return jsonError(validation.error, 400);
    const input = validation.input;
    const identifier = formName === "contact" ? input.email : input.parent_email;
    if ((0, public_forms_1.isHoneypotFilled)(input.website)) {
        await deps.logSecurityEvent({ eventType: `${formName}_honeypot_rejected`, identifier, request: deps.request });
        return jsonError("Invalid request.", 400);
    }
    const rateLimit = await (deps.rateLimit ?? public_forms_1.checkPublicFormRateLimits)(formName, identifier, deps.request);
    if (!rateLimit.allowed) {
        await deps.logSecurityEvent({
            eventType: `${formName}_rate_limited`,
            identifier,
            request: deps.request,
            metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
        });
        return jsonError("Too many submissions. Please try again later.", 429, rateLimit.retryAfterSeconds);
    }
    const turnstile = await (deps.verifyCaptcha ?? public_forms_1.verifyTurnstileToken)(input.captchaToken, deps.request);
    if (!turnstile.ok) {
        const errorMessage = "error" in turnstile ? turnstile.error : "Please complete the security check.";
        await deps.logSecurityEvent({ eventType: `${formName}_captcha_failed`, identifier, request: deps.request });
        return jsonError(errorMessage, 400);
    }
    return buildInsert(input, deps.request);
}
async function handleContactSubmission(deps) {
    return handleContactLikeSubmission("contact", deps, public_forms_1.validateContactPayload, async (input, request) => {
        const admin = deps.createAdminClient();
        const ipHash = (0, public_forms_1.requestIpHash)(request);
        const contentHash = (0, public_forms_1.normalizedContentHash)([input.name, input.email, input.phone ?? "", input.message]);
        const duplicateSince = new Date(Date.now() - duplicateWindowMinutes * 60 * 1000).toISOString();
        const [{ data: emailMatches, error: emailReadError }, { data: contentMatches, error: contentReadError }] = await Promise.all([
            admin.from("contact_messages").select("id, content_hash").eq("email", input.email).gte("created_at", duplicateSince).limit(10),
            admin.from("contact_messages").select("id").eq("ip_hash", ipHash).eq("content_hash", contentHash).gte("created_at", duplicateSince).limit(1),
        ]);
        if (emailReadError || contentReadError) {
            await deps.logSecurityEvent({
                eventType: "contact_duplicate_check_failed",
                identifier: input.email,
                request,
                metadata: { emailCode: emailReadError?.code, contentCode: contentReadError?.code },
            });
            return jsonError("We could not submit your message. Please try again in a moment.", 500);
        }
        if ((emailMatches ?? []).some((row) => row.content_hash === contentHash) || Boolean(contentMatches?.length)) {
            await deps.logSecurityEvent({ eventType: "contact_duplicate_rejected", identifier: input.email, request });
            return jsonError("This message was already submitted recently.", 409);
        }
        const { error } = await admin.from("contact_messages").insert({
            name: input.name,
            email: input.email,
            phone: input.phone,
            message: input.message,
            ip_hash: ipHash,
            content_hash: contentHash,
        });
        if (error) {
            await deps.logSecurityEvent({ eventType: "contact_submit_failed", identifier: input.email, request, metadata: { code: error.code } });
            return jsonError("We could not submit your message. Please try again in a moment.", 500);
        }
        await deps.logSecurityEvent({ eventType: "contact_submit_success", identifier: input.email, request });
        try {
            const { recordAccessLog } = await Promise.resolve().then(() => __importStar(require("./access-logs")));
            await recordAccessLog({
                userName: input.name,
                email: input.email,
                module: "Public Website",
                page: "Contact Us",
                resource: "/api/contact",
                requestMethod: "POST",
                action: "Submit Contact Message",
                statusCode: 200,
                request,
                outcome: `Contact enquiry from ${input.name} (${input.email})`,
            });
        }
        catch { }
        return server_1.NextResponse.json({ ok: true });
    });
}
async function handleAdmissionSubmission(deps) {
    return handleContactLikeSubmission("admission", deps, public_forms_1.validateAdmissionPayload, async (input, request) => {
        const supabase = await deps.createAuthClient();
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user)
            return jsonError("Please verify your phone number before submitting.", 401);
        const admin = deps.createAdminClient();
        const ipHash = (0, public_forms_1.requestIpHash)(request);
        const contentHash = (0, public_forms_1.normalizedContentHash)([
            input.student_name,
            input.date_of_birth,
            input.applying_for,
            input.parent_name,
            input.parent_email,
            input.phone,
            input.address,
        ]);
        const duplicateSince = new Date(Date.now() - duplicateWindowMinutes * 60 * 1000).toISOString();
        const [{ data: emailMatches, error: emailReadError }, { data: contentMatches, error: contentReadError }] = await Promise.all([
            admin.from("admission_applications").select("id, content_hash").eq("parent_email", input.parent_email).gte("created_at", duplicateSince).limit(10),
            admin.from("admission_applications").select("id").eq("ip_hash", ipHash).eq("content_hash", contentHash).gte("created_at", duplicateSince).limit(1),
        ]);
        if (emailReadError || contentReadError) {
            await deps.logSecurityEvent({
                eventType: "admission_duplicate_check_failed",
                userId: user.id,
                identifier: input.parent_email,
                request,
                metadata: { emailCode: emailReadError?.code, contentCode: contentReadError?.code },
            });
            return jsonError("We could not submit your application. Please try again in a moment.", 500);
        }
        if ((emailMatches ?? []).some((row) => row.content_hash === contentHash) || Boolean(contentMatches?.length)) {
            await deps.logSecurityEvent({ eventType: "admission_duplicate_rejected", userId: user.id, identifier: input.parent_email, request });
            return jsonError("This application was already submitted recently.", 409);
        }
        const { error } = await admin.from("admission_applications").insert({
            user_id: user.id,
            phone: `+91${input.phone}`,
            student_name: input.student_name,
            date_of_birth: input.date_of_birth,
            applying_for: input.applying_for,
            parent_name: input.parent_name,
            parent_email: input.parent_email,
            address: input.address,
            ip_hash: ipHash,
            content_hash: contentHash,
        });
        if (error) {
            await deps.logSecurityEvent({ eventType: "admission_submit_failed", userId: user.id, identifier: input.parent_email, request, metadata: { code: error.code } });
            return jsonError("We could not submit your application. Please try again in a moment.", 500);
        }
        await deps.logSecurityEvent({ eventType: "admission_submit_success", userId: user.id, identifier: input.parent_email, request });
        try {
            const { recordAccessLog } = await Promise.resolve().then(() => __importStar(require("./access-logs")));
            await recordAccessLog({
                userId: user.id,
                userName: input.parent_name || input.student_name,
                email: input.parent_email,
                module: "Admissions",
                page: "Public Admissions & Enquiries",
                resource: "/api/admissions",
                requestMethod: "POST",
                action: "Submit Admission Form",
                statusCode: 201,
                request,
                outcome: `Admission application submitted for ${input.student_name} (${input.applying_for})`,
            });
        }
        catch { }
        return server_1.NextResponse.json({ ok: true });
    });
}
