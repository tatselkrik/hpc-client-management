import { PROFILE_PASSWORD_MIN_LENGTH } from "../auth/authValidation";

export const getProfilePasswordValidationMessage = (
  currentPassword: string,
  nextPassword: string,
  confirmPassword: string
) => {
  if (currentPassword.trim() === "") {
    return "Enter your current password to continue.";
  }

  if (nextPassword.trim() === "") {
    return "Enter a new password.";
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

  if (currentPassword === nextPassword) {
    return "Choose a new password that is different from the current one.";
  }

  return "";
};
