export const PROFILE_PASSWORD_MIN_LENGTH = 8;

export const getFriendlyAuthErrorMessage = (
  error: unknown,
  fallback = "Authentication failed."
) => {
  const rawMessage = error instanceof Error ? error.message : String(error ?? fallback);
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (
    normalizedMessage.includes("email not confirmed") ||
    normalizedMessage.includes("confirm your email")
  ) {
    return "Please confirm your email before signing in.";
  }

  if (
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("over request rate limit")
  ) {
    return "Too many attempts. Please wait a moment, then try again.";
  }

  if (normalizedMessage.includes("aal2")) {
    return "Enter your authenticator code to continue.";
  }

  if (rawMessage.trim()) {
    return rawMessage;
  }

  return fallback;
};

export const getPasswordRecoveryValidationMessage = (
  nextPassword: string,
  confirmPassword: string
) => {
  if (nextPassword.trim() === "") {
    return "Enter your new password.";
  }

  if (nextPassword.length < PROFILE_PASSWORD_MIN_LENGTH) {
    return `Use at least ${PROFILE_PASSWORD_MIN_LENGTH} characters for your new password.`;
  }

  if (nextPassword !== nextPassword.trim()) {
    return "Remove spaces at the beginning or end of the new password.";
  }

  if (!/[A-Za-z]/.test(nextPassword) || !/\d/.test(nextPassword)) {
    return "Use at least one letter and one number in your new password.";
  }

  if (nextPassword !== confirmPassword) {
    return "New password and confirmation do not match.";
  }

  return "";
};
