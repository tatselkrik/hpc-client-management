# Release history

This file records notable changes to HPC Client Management.

## Unreleased

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

### Known dependency advisory

- `npm audit` reports two high-severity denial-of-service advisories in `image-size`, a transitive PptxGenJS dependency. The current analytics presentation exporter creates text and charts only and does not parse external image files. The available automatic remediation is a breaking PptxGenJS downgrade, so the dependency is retained pending an upstream-compatible fix.

### AI service maintenance

- Updated narrative generation from the retired Gemini 2.5 Flash endpoint to the stable Gemini 3.6 Flash model contract.
- Added completion checks, a larger response allowance, grammar guidance, and server-owned prompt versioning so incomplete AI drafts are not presented as successful reports.

## 0.1.0 - 2026-08-07

Initial private source release of the working desktop application used for limited clinic testing.

### Client workflow

- Added client intake, profile, status, category, representative, and record management.
- Added 4Ps case conceptualization with clinician-reviewed narrative drafting.
- Added C-SSRS assessment support and dashboard follow-up indicators.
- Added progress notes, documents, assessments, and phone upload handoff.

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
