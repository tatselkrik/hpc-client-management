# Release history

This file records notable changes to HPC Client Management.

## Unreleased

## 0.3.5 - 2026-08-24

### Release information and documentation

- Updated the About page so its release notes describe the Appointment Calendar,
  availability, status history, and database hardening delivered in 0.3.4.
- Updated the README, changelog, and user guide for the current release and added
  clearly labeled placeholders for new redacted calendar screenshots.
- Kept this as an application-only patch: no database migration, Edge Function,
  stored clinic data, or clinical-care workflow changed.

## 0.3.4 - 2026-08-24

### Production release

- Promoted the staging-validated calendar and hardening work to production
  through the private signed updater and verified an installed 0.2.2 upgrade to
  0.3.4 without losing existing client, user, note, or Storage records.
- Completed production role, availability, booking, conflict, intake handoff,
  status-history, audit, updater, backup, and advisor verification before the
  release was finalized.

### Appointment Calendar

- Added Staff and Admin appointment booking for existing clients and
  provisional first-timers, plus rescheduling, confirmation, arrival,
  cancellation, no-show, intake handoff, and recoverable removal.
- Added clinician and team availability, clinic hours, services, appointment
  lengths, weekly and daily schedule views, a Philippine clock, explicit status
  actions, and immutable server-timed history.
- Added appointment activity to Analytics while leaving messaging, payments,
  SMS, video calls, client portals, tasks, documents/forms, and clinical-care
  changes outside this release.

### Database and API hardening

- Moved privileged row-level-security helpers out of the exposed Data API schema
  while preserving the existing role and client-access rules.
- Removed anonymous and unnecessary signed-in execution of privileged database
  functions, fixed mutable function search paths, and retained only the RPCs
  required by the desktop application.
- Consolidated overlapping read policies and cached stable authentication checks
  so access decisions remain equivalent with less per-row policy work.
- Protected client-authored audit events with server-stamped identity and time
  fields, and added indexes for every foreign key reported by the advisor.

## 0.3.3 - 2026-08-23

### Calendar interaction polish

- Kept booking, cancellation, and removal errors inside their active modal,
  while successful modal actions now close automatically and leave a readable,
  dismissible confirmation.
- Replaced browser prompts for appointment cancellation and removal with a
  clear appointment-specific confirmation that explains recoverable removal
  and requires an operational reason.
- Replaced the unbounded existing-client dropdown with a searchable picker that
  renders at most 12 matches at once and remains usable with large caseloads.
- Preserved success feedback after calendar data refreshes for availability,
  clinic-hours, services, appointment edits, and status changes.

## 0.3.2 - 2026-08-23

### Daily clinic flow

- Added a day-focused appointment status board with explicit action buttons for
  Scheduled, Confirmed, Arrived, Intake, In Session, and Completed milestones.
- Added an immutable, database-timed status history showing when and by whom
  each appointment milestone was recorded.
- Added a live Philippine clock to the Calendar workspace. Display time uses
  Asia/Manila while saved workflow times come from the database server.
- Grouped matching clinician hours in the all-clinicians availability view and
  made availability blocks open readable, read-only details for Staff and Admin.
- Added status-history coverage to clinic backup export and merge restore.

## 0.3.1 - 2026-08-23

### Staging calendar repairs

- Repaired the shared calendar audit trigger so clinic hours, appointment
  services, availability, and appointment changes save and audit correctly.
- Recognized every active account with an HPC Representative assignment as a
  clinician, including an Admin clinician such as Clinic Administrator.
- Replaced the date-exception list with a dated weekly timeline where clinicians
  can set available or unavailable blocks, and added a read-only Team
  availability tab for Staff and Admin.
- Prevented overlapping dated available/unavailable blocks in both the interface
  and database.
- Added audited soft removal for mistaken appointments while preventing removal
  after intake or clinical care has begun.
- Added covering indexes for all appointment-calendar foreign keys and retained
  Philippine-time, MFA, RLS, audit, and double-booking safeguards.

## 0.3.0 - 2026-08-23

### Appointment calendar

- Added a staff-managed Calendar workspace for booking, rescheduling,
  confirming, cancelling, arrival tracking, no-shows, and intake handoff.
- Added separate booking flows for existing clients and first-timers. A
  first-timer remains provisional until staff begins intake after arrival;
  that action creates and links the client record transactionally.
- Added personal weekly availability and date exceptions for psychologists and
  counselors, plus Admin-managed clinic hours, services, and appointment
  lengths.
- Added Philippine-time scheduling, database-enforced provider availability,
  service durations, valid status transitions, and double-booking prevention.
- Added role-aware calendar access, MFA enforcement, audit history, backup and
  restore coverage, and appointment activity in Analytics.
- Telecounseling is recorded only as a session mode for future integration; no
  video-call, messaging, payment, SMS, client-portal, document, form, or task
  system is included.

## 0.2.2 - 2026-08-10

### Stable clinic deployment

- Finalized 0.2.2 as the stable clinic snapshot on 20 August 2026 after
  successful installation at the clinic and on the maintenance PC.
- Corrected the production cutover tooling used during deployment so migration
  history repair remains self-contained and the reviewed role normalization can
  run safely against the Version 1 baseline trigger.
- Deferred the appointment calendar to a future version; it is not included in
  the 0.2.2 release.

### Signed update validation

- Added the second signed staging release used to prove that an installed
  updater-enabled version can privately download, verify, install, and restart
  into the next version without manual installer access.
- Selected this validated updater build line as the next production cutover
  baseline; no client-record or role-policy behavior changed from 0.2.1.

### Documentation

- Replaced the obsolete release-candidate manual link with a role-aware 0.2.2
  user guide for everyday operation.
- Reconciled the migration runbook, secrets checklist, verification queries,
  and staging record with the 0.2.2 database, updater, and deployment process.

## 0.2.1 - 2026-08-10

### Private signed updates

- Added an authenticated Tauri updater that downloads, verifies, installs, and
  restarts from the About page after explicit user confirmation.
- Added a private Supabase Storage release bucket and an MFA-protected dynamic
  update endpoint that issues short-lived download links only to active users.
- Added encrypted local updater signing, signed build artifacts, and release
  commands locked to the staging and production Supabase project references.
- Kept the private GitHub source repository separate from application update
  distribution; ordinary Git pushes do not publish clinic updates.

## 0.2.0 - 2026-08-10

### Access control

- Reduced account roles to Admin, Psychologist / Counselor, and Staff.
- Added a migration that converts CEO accounts to Admin and deactivates former Intern accounts while retaining their history.
- Limited Psychologist / Counselor accounts to their assigned clients, dashboard data, and analytics.
- Allowed Staff to work across dashboard, clients, analytics, Care Team, categories, and backup review without access to System Log.
- Prevented Staff from creating, promoting, editing, deactivating, or otherwise affecting Admin accounts.
- Kept Staff clinical tabs read-only and restricted AI 4Ps narrative generation to Admin and the assigned Psychologist / Counselor.

### Account security

- Replaced administrator-shared temporary passwords with invitation emails and required password setup.
- Added a Windows app link that returns accepted invitations to the installed application.
- Added an isolated staging installer identity and invitation-link scheme so staging can coexist with the working application.
- Required verified MFA before clinical, operational, storage, export, or AI narrative access.
- Required a fresh MFA session for Care Team invitations, role changes, and deactivations.
- Changed Care Team removal to reversible account deactivation.

### Backend hardening

- Removed user-controlled role assignment during Auth profile creation.
- Protected role, activation, and representative-assignment fields from direct profile updates.
- Restricted audit insertion to the validated audit function and marked client-reported events.
- Prevented upload validation from deleting storage paths before caller ownership is established.
- Added explicit least-privilege service grants for protected Edge Functions when automatic table exposure is disabled.
- Added automated role-matrix and security-contract regression tests.

### Experience and reporting

- Added editable clinic phone, email, and location settings for Admin and Staff.
- Renamed Backup and Review to Backup and Restore and added an Admin-only, fresh-MFA,
  merge restore that never deletes records absent from a backup package.
- Added a secure staging release channel so Check for Updates reports the latest configured version.
- Added a shared branded template set for invitations, account actions, and security notification emails.
- Added a visual quick-read strip to Analytics for active caseload, pending C-SSRS follow-up,
  and progress-note coverage.
- Redesigned the PowerPoint analytics export with stronger hierarchy, improved contrast,
  larger charts, explicit empty states, authentic Clinic branding, a separate
  life-context slide, and a data-driven key-takeaways conclusion.

### Backup restore scope

- Restore packages are limited to the Supabase project that created them.
- Restore merges application records only. Supabase Auth identities and Storage file contents
  remain outside the app-generated JSON package; document and assessment metadata is included.

### Known dependency advisory

- `npm audit` reports two high-severity denial-of-service advisories in `image-size`, a transitive PptxGenJS dependency. The current analytics presentation exporter uses only trusted, bundled Clinic PNG files and does not process user-selected or remote images. The available automatic remediation is a breaking PptxGenJS downgrade, so the dependency is retained pending an upstream-compatible fix.

### AI service maintenance

- Updated narrative generation from the retired Gemini 2.5 Flash endpoint to the stable Gemini 3.6 Flash model contract.
- Added completion checks, a larger response allowance, grammar guidance, and server-owned prompt versioning so incomplete AI drafts are not presented as successful reports.

### Deferred functionality

- Hid Upload from Phone and disabled its server validation path until separate hosting,
  privacy review, and end-to-end security testing are complete. Desktop file uploads remain available.

### Known release limitation

- Free-tier Gemini data handling remains unapproved for identifying clinical information.
  Users must not enter client names or other identifying details in 4Ps fields used for AI
  narrative generation. The provider arrangement requires privacy review before that restriction changes.

## 0.1.0 - 2026-08-07

Initial private source release of the working desktop application used for limited clinic testing.

### Client workflow

- Added client intake, profile, status, category, representative, and record management.
- Added 4Ps case conceptualization with clinician-reviewed narrative drafting.
- Added C-SSRS assessment support and dashboard follow-up indicators.
- Added progress notes and desktop document and assessment uploads.

### Operations and reporting

- Added a daily dashboard for client activity and documentation priorities.
- Added analytics filters, summary metrics, demographic views, and workload charts.
- Added CSV and PowerPoint export options.
- Added client category management and structured backup export with read-only review.

### Accounts and administration

- Added care-team account creation, role management, and representative assignment.
- Added profile management, password changes, multi-factor authentication, and idle-session locking.
- Added clinic announcements, display themes, and system activity review.

### Platform

- Added the Tauri desktop shell with a React and TypeScript interface.
- Added Supabase authentication, database migrations, storage configuration, Row Level Security policies, and Edge Functions.
- Added upload validation for client documents, assessments, and profile images.
- Added operational runbooks, verification queries, and the release-candidate testing manual.
