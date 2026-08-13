"use strict";
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
        return server_1.NextResponse.json({ ok: true });
    });
}
