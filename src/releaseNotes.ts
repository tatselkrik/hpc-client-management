export const APP_RELEASE_NOTES_VERSION = "0.3.6";

export const APP_RELEASE_NOTES = [
  "Email-and-password sign-in on the updated backend for all roles, with no MFA enrollment controls. Older backends retain existing authenticator verification until their coordinated update.",
  "Account changes retain password confirmation; protected care-team administration and backup restore require a recent password sign-in.",
  "Improved calendar loading for larger appointment histories and team availability lists.",
  "Corrected appointment analytics to exclude removed bookings and visits scheduled in the future.",
  "The accompanying backend update rechecks clinician availability when restoring cancelled or no-show appointments. Existing clinical-care workflows are unchanged.",
] as const;
