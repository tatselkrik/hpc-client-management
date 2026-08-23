# Release history

This file records the stable public milestones of HPC Client Management.
Intermediate development and validation builds are consolidated into the next
stable release.

## Unreleased

## 0.3.5 - 2026-08-24

### Appointment Calendar

- Added Staff and Admin appointment booking for existing clients and
  provisional first-timers, including rescheduling, confirmation, arrival,
  cancellation, no-show handling, intake handoff, and recoverable removal.
- Added clinician and team availability, configurable clinic hours, services,
  appointment lengths, weekly and daily views, and Philippine-time display.
- Added database-enforced provider availability, conflict prevention, service
  durations, valid status transitions, and immutable server-timed history.
- Added appointment activity to Analytics and retained telecounseling only as a
  recorded session mode for future integration.

### Workflow and usability

- Added explicit appointment-status actions for Scheduled, Confirmed, Arrived,
  Intake, In Session, and Completed milestones.
- Added readable availability details, searchable client selection, consistent
  modal feedback, and clear cancellation and recoverable-removal confirmation.
- Recognized every active HPC Representative as a clinician regardless of the
  account's display role.

### Security and database hardening

- Moved privileged row-level-security helpers out of the exposed Data API
  schema and removed unnecessary execution grants.
- Fixed privileged function search paths, consolidated overlapping policies,
  and cached stable authentication checks without weakening role boundaries.
- Protected audit identity and time fields with server-side stamping and added
  indexes for calendar foreign keys.
- Preserved existing client records, clinical documentation, analytics,
  backups, multi-factor authentication, and signed-update behavior.

## 0.2.2 - 2026-08-20

### Clinic deployment and access control

- Finalized the updater-enabled clinic baseline and simplified account roles to
  Admin, Psychologist / Counselor, and Staff.
- Required email invitations, user-selected passwords, multi-factor
  authentication, fresh verification for sensitive administration, and
  reversible account deactivation.
- Restricted clinicians to assigned clients and limited Staff clinical access
  while preserving appropriate clinic-wide administrative workflows.

### Operations, reporting, and updates

- Added editable clinic information, structured backup review and merge restore,
  improved Analytics summaries, and redesigned PowerPoint exports.
- Added authenticated, privately distributed, cryptographically signed desktop
  updates with user-confirmed installation and restart.
- Added role-matrix, security-contract, workflow, and version-consistency tests.
- Deferred Upload from Phone pending separate hosting and privacy review.

## 0.1.0 - 2026-08-07

Initial working desktop application for limited clinic testing.

### Client and clinical workflows

- Added client intake, profiles, status, categories, representative assignment,
  4Ps case conceptualization, C-SSRS screening, progress notes, documents, and
  assessments.

### Operations and platform

- Added dashboard priorities, analytics, CSV and PowerPoint exports, care-team
  administration, profile settings, themes, activity review, and backup export.
- Added the Tauri desktop shell, React and TypeScript interface, Supabase Auth,
  Postgres migrations, Storage, Row Level Security, and Edge Functions.
