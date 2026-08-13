const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?\d{10,15}$/;

export const genericAuthError = "Invalid credentials. Check your details and try again.";
export const genericResetMessage = "If an account exists for that email, a password reset link has been sent.";

export function normalizeIdentifier(value: unknown) {
  const identifier = typeof value === "string" ? value.trim() : "";
  const phone = identifier.replace(/[\s()-]/g, "");

  if (phonePattern.test(phone)) {
    return {
      kind: "phone" as const,
      value: phone.startsWith("+") ? phone : `+91${phone}`,
      displayValue: phone.startsWith("+") ? phone : `+91${phone}`,
    };
  }

  return {
    kind: "email" as const,
    value: identifier.toLowerCase(),
    displayValue: identifier.toLowerCase(),
  };
}

export function isValidEmail(value: string) {
  return emailPattern.test(value);
}

export function isValidIdentifier(identifier: ReturnType<typeof normalizeIdentifier>) {
  return identifier.kind === "phone" ? phonePattern.test(identifier.value) : isValidEmail(identifier.value);
}

export function validateNewPassword(password: string) {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
