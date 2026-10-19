export const APP_RELEASE_NOTES_VERSION = "0.3.8";

export const APP_RELEASE_NOTES = [
  "Redesigned Analytics presentations with the approved navy and ivory layout, larger editable charts, and readable continuation slides for longer category and clinician lists.",
  "Exported reporting windows now match the selected client filters. Appointment outcomes retain their separate, clearly labeled 30-day operations window.",
  "CSV exports protect spreadsheet text and now contain grouped statistics with small groups suppressed. Presentation formatting, Philippine-time reporting windows and corrected 4Ps flags are preserved.",
  "Sessions lock locally before network requests and discard all workspace caches on sign-out or account changes. Sign in again after restarting the app; tokens are no longer saved in browser storage.",
  "Client forms are bound to the loaded record. Intake and child records save together with conflict checks; clinic-hour and care-team changes are transactional and audited.",
  "Backups use a consistent snapshot and passphrase encryption. Keep the passphrase separately; it is required for recovery. Legacy JSON backups can still be reviewed and restored by an Admin.",
  "Uploads require server content checks before access. Convert legacy DOC, XLS and PPT files to PDF or supported Office formats; files with active content are not accepted.",
  "Exports are audited and limited to selected Save-dialog paths. Updates refresh authorization before installation, and the image parser dependency is patched.",
  "Version 0.3.8 retains the 0.3.7 export improvements and requires matching database migrations and Edge services.",
] as const;
