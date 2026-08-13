"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = normalizeText;
exports.isHoneypotFilled = isHoneypotFilled;
exports.validateContactPayload = validateContactPayload;
exports.validateAdmissionPayload = validateAdmissionPayload;
exports.normalizedContentHash = normalizedContentHash;
const crypto_1 = require("crypto");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M} .'-]+$/u;
const classPattern = /^[\p{L}\p{M}0-9 .'-]+$/u;
function normalizeText(value) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
}
function isHoneypotFilled(value) {
    return normalizeText(value).length > 0;
}
function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
}
function normalizePhone(value) {
    return normalizeText(value).replace(/\D/g, "");
}
function hasUnsafeMarkup(value) {
    return /<[^>]*>|javascript:/i.test(value);
}
function validateName(value, label) {
    if (value.length < 2)
        return `Please enter ${label}.`;
    if (value.length > 80)
        return `${label} must be 80 characters or fewer.`;
    if (!namePattern.test(value))
        return `${label} contains unsupported characters.`;
    return null;
}
function validateEmail(value) {
    if (!value || value.length > 254 || !emailPattern.test(value))
        return "Please enter a valid email address.";
    return null;
}
function validateIndianPhone(value, required) {
    if (!value)
        return required ? "Please enter a valid 10-digit phone number." : null;
    if (!/^[6-9]\d{9}$/.test(value))
        return "Please enter a valid 10-digit phone number.";
    return null;
}
function rejectUnexpectedFields(body, allowed) {
    return Object.keys(body).filter((key) => !allowed.has(key));
}
function validateContactPayload(body) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        return { error: "Invalid request." };
    const payload = body;
    const unexpected = rejectUnexpectedFields(payload, new Set(["name", "email", "phone", "message", "captchaToken", "website"]));
    if (unexpected.length)
        return { error: "Invalid request." };
    const input = {
        name: normalizeText(payload.name),
        email: normalizeEmail(payload.email),
        phone: normalizePhone(payload.phone) || null,
        message: normalizeText(payload.message),
        captchaToken: typeof payload.captchaToken === "string" ? payload.captchaToken : "",
        website: normalizeText(payload.website),
    };
    const nameError = validateName(input.name, "your full name");
    if (nameError)
        return { error: nameError };
    const emailError = validateEmail(input.email);
    if (emailError)
        return { error: emailError };
    const phoneError = validateIndianPhone(input.phone ?? "", false);
    if (phoneError)
        return { error: phoneError };
    if (input.message.length < 10)
        return { error: "Your message should be at least 10 characters." };
    if (input.message.length > 2000)
        return { error: "Your message must be 2,000 characters or fewer." };
    if (hasUnsafeMarkup(input.message))
        return { error: "Your message contains unsupported content." };
    return { input };
}
function validateAdmissionPayload(body) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        return { error: "Invalid request." };
    const payload = body;
    const unexpected = rejectUnexpectedFields(payload, new Set(["student_name", "date_of_birth", "applying_for", "parent_name", "parent_email", "phone", "address", "captchaToken", "website"]));
    if (unexpected.length)
        return { error: "Invalid request." };
    const input = {
        student_name: normalizeText(payload.student_name),
        date_of_birth: normalizeText(payload.date_of_birth),
        applying_for: normalizeText(payload.applying_for),
        parent_name: normalizeText(payload.parent_name),
        parent_email: normalizeEmail(payload.parent_email),
        phone: normalizePhone(payload.phone),
        address: normalizeText(payload.address),
        captchaToken: typeof payload.captchaToken === "string" ? payload.captchaToken : "",
        website: normalizeText(payload.website),
    };
    const studentNameError = validateName(input.student_name, "the student name");
    if (studentNameError)
        return { error: studentNameError };
    const parentNameError = validateName(input.parent_name, "the parent or guardian name");
    if (parentNameError)
        return { error: parentNameError };
    const emailError = validateEmail(input.parent_email);
    if (emailError)
        return { error: emailError };
    const phoneError = validateIndianPhone(input.phone, true);
    if (phoneError)
        return { error: phoneError };
    if (input.applying_for.length < 1 || input.applying_for.length > 40 || !classPattern.test(input.applying_for)) {
        return { error: "Please enter a valid class." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date_of_birth))
        return { error: "Please enter a valid date of birth." };
    const birthDate = new Date(`${input.date_of_birth}T00:00:00.000Z`);
    if (Number.isNaN(birthDate.getTime()) || birthDate.getTime() > Date.now())
        return { error: "Please enter a valid date of birth." };
    if (input.address.length < 10)
        return { error: "Please enter a complete address." };
    if (input.address.length > 500)
        return { error: "Address must be 500 characters or fewer." };
    if (hasUnsafeMarkup(input.address))
        return { error: "Address contains unsupported content." };
    return { input };
}
function normalizedContentHash(values) {
    return (0, crypto_1.createHash)("sha256")
        .update(values.map((value) => normalizeText(value).toLowerCase()).join("\n"))
        .digest("hex");
}
