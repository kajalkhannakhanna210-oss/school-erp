import { NextResponse, type NextRequest } from "next/server";
import {
  checkPublicFormRateLimits,
  isHoneypotFilled,
  isSameOriginRequest,
  normalizedContentHash,
  requestIpHash,
  validateAdmissionPayload,
  validateContactPayload,
  verifyTurnstileToken,
} from "./public-forms";

const duplicateWindowMinutes = 30;

type Logger = (input: {
  eventType: string;
  userId?: string | null;
  identifier?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}) => Promise<void>;

type AdminClient = ReturnType<typeof import("../supabase/admin").createAdminClient>;

type ContactDeps = {
  request: NextRequest;
  body: unknown;
  createAdminClient: () => AdminClient;
  logSecurityEvent: Logger;
  rateLimit?: typeof checkPublicFormRateLimits;
  verifyCaptcha?: typeof verifyTurnstileToken;
};

type AdmissionDeps = ContactDeps & {
  createAuthClient: () => Promise<{ auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } }>;
};

function jsonError(error: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
    }
  );
}

async function handleContactLikeSubmission(
  formName: "contact" | "admission",
  deps: ContactDeps,
  validate: typeof validateContactPayload | typeof validateAdmissionPayload,
  buildInsert: (input: any, request: NextRequest) => Promise<Response>
) {
  if (!isSameOriginRequest(deps.request)) return jsonError("Invalid request.", 403);
  if (!deps.request.headers.get("content-type")?.toLowerCase().includes("application/json")) return jsonError("Invalid request.", 415);

  const validation = validate(deps.body);
  if ("error" in validation) return jsonError(validation.error, 400);

  const input = validation.input;
  const identifier = formName === "contact" ? (input as { email: string }).email : (input as { parent_email: string }).parent_email;
  if (isHoneypotFilled(input.website)) {
    await deps.logSecurityEvent({ eventType: `${formName}_honeypot_rejected`, identifier, request: deps.request });
    return jsonError("Invalid request.", 400);
  }

  const rateLimit = await (deps.rateLimit ?? checkPublicFormRateLimits)(formName, identifier, deps.request);
  if (!rateLimit.allowed) {
    await deps.logSecurityEvent({
      eventType: `${formName}_rate_limited`,
      identifier,
      request: deps.request,
      metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    return jsonError("Too many submissions. Please try again later.", 429, rateLimit.retryAfterSeconds);
  }

  const turnstile = await (deps.verifyCaptcha ?? verifyTurnstileToken)(input.captchaToken, deps.request);
  if (!turnstile.ok) {
    const errorMessage = "error" in turnstile ? turnstile.error : "Please complete the security check.";
    await deps.logSecurityEvent({ eventType: `${formName}_captcha_failed`, identifier, request: deps.request });
    return jsonError(errorMessage, 400);
  }

  return buildInsert(input, deps.request);
}

export async function handleContactSubmission(deps: ContactDeps) {
  return handleContactLikeSubmission(
    "contact",
    deps,
    validateContactPayload,
    async (input, request) => {
      const admin = deps.createAdminClient();
      const ipHash = requestIpHash(request);
      const contentHash = normalizedContentHash([input.name, input.email, input.phone ?? "", input.message]);
      const duplicateSince = new Date(Date.now() - duplicateWindowMinutes * 60 * 1000).toISOString();

      const [{ data: emailMatches, error: emailReadError }, { data: contentMatches, error: contentReadError }] =
        await Promise.all([
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

      if ((emailMatches ?? []).some((row: { content_hash: string }) => row.content_hash === contentHash) || Boolean(contentMatches?.length)) {
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
      return NextResponse.json({ ok: true });
    }
  );
}

export async function handleAdmissionSubmission(deps: AdmissionDeps) {
  return handleContactLikeSubmission(
    "admission",
    deps,
    validateAdmissionPayload,
    async (input, request) => {
      const supabase = await deps.createAuthClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return jsonError("Please verify your phone number before submitting.", 401);

      const admin = deps.createAdminClient();
      const ipHash = requestIpHash(request);
      const contentHash = normalizedContentHash([
        input.student_name,
        input.date_of_birth,
        input.applying_for,
        input.parent_name,
        input.parent_email,
        input.phone,
        input.address,
      ]);
      const duplicateSince = new Date(Date.now() - duplicateWindowMinutes * 60 * 1000).toISOString();

      const [{ data: emailMatches, error: emailReadError }, { data: contentMatches, error: contentReadError }] =
        await Promise.all([
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

      if ((emailMatches ?? []).some((row: { content_hash: string }) => row.content_hash === contentHash) || Boolean(contentMatches?.length)) {
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
      return NextResponse.json({ ok: true });
    }
  );
}
