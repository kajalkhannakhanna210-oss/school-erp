"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
exports.getUserAgent = getUserAgent;
exports.hashIdentifier = hashIdentifier;
exports.hashIp = hashIp;
exports.checkRateLimit = checkRateLimit;
exports.checkRateLimitKey = checkRateLimitKey;
exports.clearRateLimit = clearRateLimit;
exports.logSecurityEvent = logSecurityEvent;
const crypto_1 = require("crypto");
const headers_1 = require("next/headers");
const admin_1 = require("../supabase/admin");
function secret() {
    return process.env.RATE_LIMIT_SECRET ?? process.env.REMEMBER_DEVICE_TOKEN_SECRET;
}
function hmac(value) {
    const key = secret();
    if (!key)
        return (0, crypto_1.createHash)("sha256").update(value).digest("hex");
    return (0, crypto_1.createHmac)("sha256", key).update(value).digest("hex");
}
function headerValue(name, request) {
    if (request)
        return request.headers.get(name);
    try {
        return (0, headers_1.headers)().get(name);
    }
    catch {
        return null;
    }
}
function getClientIp(request) {
    const forwardedFor = headerValue("x-vercel-forwarded-for", request) ?? headerValue("x-forwarded-for", request);
    if (forwardedFor)
        return forwardedFor.split(",")[0]?.trim() || "unknown";
    return headerValue("x-real-ip", request) ?? "unknown";
}
function getUserAgent(request) {
    return headerValue("user-agent", request) ?? null;
}
function hashIdentifier(identifier) {
    return identifier ? hmac(identifier.trim().toLowerCase()) : null;
}
function hashIp(ip) {
    return ip ? hmac(ip) : null;
}
async function checkRateLimit(input) {
    const ip = getClientIp(input.request);
    const identifierPart = input.identifier ? input.identifier.trim().toLowerCase() : "anonymous";
    return checkRateLimitKey({
        action: input.action,
        scope: `${ip}:${identifierPart}`,
        limit: input.limit,
        windowSeconds: input.windowSeconds,
        blockSeconds: input.blockSeconds,
    });
}
async function checkRateLimitKey(input) {
    const key = hmac(`${input.action}:${input.scope}`);
    const admin = (0, admin_1.createAdminClient)();
    const { data, error } = await admin.rpc("check_rate_limit", {
        p_key: key,
        p_action: input.action,
        p_limit: input.limit,
        p_window_seconds: input.windowSeconds,
        p_block_seconds: input.blockSeconds,
    });
    if (error) {
        console.warn("Auth rate-limit check failed", { action: input.action, code: error.code });
        return { allowed: input.failOpen ?? true, retryAfterSeconds: input.failOpen === false ? input.blockSeconds : 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
        allowed: Boolean(row?.allowed),
        retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
    };
}
async function clearRateLimit(action, identifier, request) {
    const ip = getClientIp(request);
    const key = hmac(`${action}:${ip}:${identifier.trim().toLowerCase()}`);
    const { error } = await (0, admin_1.createAdminClient)().from("auth_rate_limits").delete().eq("key", key);
    if (error)
        console.warn("Auth rate-limit clear failed", { action, code: error.code });
}
async function logSecurityEvent(input) {
    const ip = getClientIp(input.request);
    const userAgent = getUserAgent(input.request);
    const { error } = await (0, admin_1.createAdminClient)().from("auth_security_events").insert({
        event_type: input.eventType,
        user_id: input.userId ?? null,
        identifier_hash: hashIdentifier(input.identifier),
        ip_hash: hashIp(ip),
        user_agent: userAgent ? userAgent.slice(0, 300) : null,
        metadata: input.metadata ?? {},
    });
    if (error)
        console.warn("Security event log failed", { eventType: input.eventType, code: error.code });
}
