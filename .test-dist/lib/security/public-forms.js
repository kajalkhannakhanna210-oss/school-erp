"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHoneypotFilled = exports.validateContactPayload = exports.validateAdmissionPayload = exports.normalizedContentHash = exports.formRateLimit = void 0;
exports.isSameOriginRequest = isSameOriginRequest;
exports.verifyTurnstileToken = verifyTurnstileToken;
exports.checkPublicFormRateLimits = checkPublicFormRateLimits;
exports.requestIpHash = requestIpHash;
const public_forms_core_1 = require("./public-forms-core");
Object.defineProperty(exports, "normalizedContentHash", { enumerable: true, get: function () { return public_forms_core_1.normalizedContentHash; } });
Object.defineProperty(exports, "isHoneypotFilled", { enumerable: true, get: function () { return public_forms_core_1.isHoneypotFilled; } });
Object.defineProperty(exports, "validateAdmissionPayload", { enumerable: true, get: function () { return public_forms_core_1.validateAdmissionPayload; } });
Object.defineProperty(exports, "validateContactPayload", { enumerable: true, get: function () { return public_forms_core_1.validateContactPayload; } });
const server_1 = require("./server");
exports.formRateLimit = {
    limit: 3,
    windowSeconds: 10 * 60,
    blockSeconds: 10 * 60,
};
function isSameOriginRequest(req) {
    const origin = req.headers.get("origin");
    if (!origin)
        return true;
    return origin === req.nextUrl.origin;
}
async function verifyTurnstileToken(token, req) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret)
        return { ok: false, error: "Bot protection is not configured." };
    if (!token || token.length > 4096)
        return { ok: false, error: "Please complete the security check." };
    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    const ip = (0, server_1.getClientIp)(req);
    if (ip !== "unknown")
        formData.set("remoteip", ip);
    try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: formData,
        });
        const result = (await response.json());
        return result.success ? { ok: true } : { ok: false, error: "Please complete the security check." };
    }
    catch {
        return { ok: false, error: "We could not verify the security check. Please try again." };
    }
}
async function checkPublicFormRateLimits(formName, email, req) {
    const ip = (0, server_1.getClientIp)(req);
    const [ipLimit, emailLimit] = await Promise.all([
        (0, server_1.checkRateLimitKey)({ action: `${formName}_submission_ip`, scope: `ip:${ip}`, ...exports.formRateLimit, failOpen: false }),
        (0, server_1.checkRateLimitKey)({ action: `${formName}_submission_email`, scope: `email:${email}`, ...exports.formRateLimit, failOpen: false }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds),
        };
    }
    return { allowed: true, retryAfterSeconds: 0 };
}
function requestIpHash(req) {
    return (0, server_1.hashIp)((0, server_1.getClientIp)(req));
}
