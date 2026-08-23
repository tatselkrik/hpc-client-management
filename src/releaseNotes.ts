export const APP_RELEASE_NOTES_VERSION = "0.3.5";

export const APP_RELEASE_NOTES = [
  "Added a staff-managed Appointment Calendar for existing clients and first-timers, with rescheduling, confirmation, arrival, cancellation, no-show, intake handoff, and recoverable removal.",
  "Added clinician availability, team availability, configurable clinic hours, services, appointment lengths, and database-enforced double-booking protection.",
  "Added a daily status board, Philippine clock, and immutable server-timed appointment history for Scheduled through Completed milestones.",
  "Hardened database permissions and row-level-security performance while preserving the existing client, clinical documentation, analytics, and signed-update workflows.",
] as const;
