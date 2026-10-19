# HPC Client Management

[![Quality checks](https://github.com/tatselkrik/hpc-client-management/actions/workflows/quality.yml/badge.svg)](https://github.com/tatselkrik/hpc-client-management/actions/workflows/quality.yml)

HPC Client Management is a Windows desktop application for clinic client
records, clinical documentation, care-team access, analytics, appointment
scheduling, and day-to-day administrative workflows.

**Current version:** 0.3.8

**Platform:** Windows desktop · **Distribution:** Public source; production configuration is supplied privately

[User guide](docs/user-guide-0.3.8.md) · [Release log](#release-log) ·
[Application tour](#application-tour) · [Developer setup](#developer-setup)

## What's new in 0.3.8

- Immediate local locking, identity-scoped cache cleanup and memory-only sessions.
- Client-bound atomic saves, checked conflicts and audited administration.
- Passphrase-encrypted backups, bounded restore requests and verified upload content.
- Audited aggregate CSV exports with small-group suppression and narrower native writes.
- Refreshed update authorization and a patched image parser dependency.
- Retains the export improvements introduced in 0.3.7.

Apply the matching migrations and deploy the five changed Edge Functions before
updating desktops. Building or installing the app does not deploy its backend.

## What's new in 0.3.6

- Email-and-password sign-in after the coordinated backend update, with no MFA
  enrollment or account-factor controls. Previously enrolled authenticators are
  retired by the deployment operator; future MFA would require fresh enrollment.
- Current-password confirmation for account changes and a recent password
  sign-in for protected administrative actions.
- Reliable calendar loading across larger appointment and availability lists.
- Availability is checked again when reinstating cancelled or no-show bookings.
- Appointment analytics exclude removed bookings and future appointments from
  the recent 30-day summary.

Clinical-care workflows are unchanged. See [authentication and rollout
requirements](docs/authentication.md) and the [full changelog](CHANGELOG.md).

## Appointment Calendar

- Staff and Admin can book and manage appointments for existing clients and
  provisional first-timers without creating a client before intake.
- Active clinicians can maintain their availability. Staff and Admin can review
  team availability, while Admin can configure clinic hours, services, and
  appointment lengths.
- Weekly and daily schedules provide explicit status actions, Philippine time,
  immutable server timestamps, conflict prevention, and recoverable removal of
  mistaken appointments.
- Appointment activity is included in Analytics.
- Database permissions, row-level-security helpers, audit identity stamping,
  and foreign-key indexes are hardened without changing clinical-care records.

Calendar is internal-only: clients book by contacting the clinic, and Staff or
Admin enters the appointment. Messaging, billing, payments, SMS, video-call
integrations, and a client portal are not included.

## Core capabilities

- Centralized client intake and record management
- Staff-managed appointments for existing clients and first-timers
- Clinician availability, team availability, clinic hours, services, and
  appointment lengths
- Weekly and daily schedules, intake handoff, operational statuses, and
  double-booking protection
- 4Ps case conceptualization with clinician-reviewed narrative drafting
- C-SSRS screening workflow and follow-up indicators
- Progress notes, documents, and assessment uploads
- Dashboard priorities and clinic-wide analytics
- CSV and PowerPoint exports
- Email-invited care-team accounts and role-based access
- Password-only sign-in on the updated backend, idle-session locking, and audit
  history
- Structured backup export and Admin-confirmed merge restore
- Support for authenticated, privately distributed signed updates when an
  operator configures an updater endpoint and signing key

## Installation and updates

This repository distributes source, not the clinic's production installer.
Authorized clinic users receive the privately configured Windows installer or
use **About → Check for Updates** in a compatible installation. The private
updater verifies the installer signature before installation and restart.

An older MFA-dependent installation must be replaced with the current installer
before using a backend where MFA has been retired. Uninstalling the application
is not normally required. Installing the desktop update does not apply database
migrations or configure Supabase automatically.

The deployment operator must back up and verify the backend, coordinate the
authentication transition, and deploy the matching migrations and Edge
Functions. Public GitHub source releases and private desktop-update publication
are separate steps.

## Release log

Versioned source changes are recorded below. Selected stable milestones also
have tagged releases; source history does not publish a production installer.

| Version | Released | Summary |
| --- | --- | --- |
| [0.3.8](CHANGELOG.md#038---2026-10-19) | 2026-10-19 | Session and access hardening, atomic audited changes, encrypted backups, verified uploads and protected exports |
| [0.3.7](CHANGELOG.md#037---2026-10-16) | 2026-10-16 | Editable presentation export improvements, reporting filters, CSV formula handling and Philippine-time fixes |
| [0.3.6](CHANGELOG.md#036---2026-10-12) | 2026-10-12 | Password-only authentication transition, calendar correctness and loading fixes, and updated operator documentation |
| [0.3.5](CHANGELOG.md#035---2026-08-24) | 2026-08-24 | Appointment Calendar, availability, status workflow, scheduling analytics, and database hardening |
| [0.2.2](CHANGELOG.md#022---2026-08-20) | 2026-08-20 | Clinic deployment baseline, role-based access, backups, reporting, and signed updates |
| [0.1.0](CHANGELOG.md#010---2026-08-07) | 2026-08-07 | Initial desktop client records and clinical-documentation workspace |

See [CHANGELOG.md](CHANGELOG.md) for the complete milestone notes and
[GitHub Releases](https://github.com/tatselkrik/hpc-client-management/releases)
for tagged source snapshots. Earlier release notes describe the behavior at the
time, including MFA before 0.3.6.

## Application tour

The approved version 0.3.5 screenshots below have clinic-specific account
details and identifying information blurred. They are historical examples:
0.3.6 no longer provides MFA enrollment in Profile, and About shows the newer
version and release notes. Updated screenshots will be added after privacy
review; the approved Calendar gallery is retained below.

<details>
<summary><strong>Login</strong></summary>

![HPC Client Management sign-in screen](docs/screenshots/login-v0.3.5.jpg)

</details>

<details>
<summary><strong>Dashboard</strong></summary>

![HPC Client Management dashboard](docs/screenshots/dashboard-v0.3.5.jpg)

</details>

<details>
<summary><strong>Clients</strong></summary>

![HPC Client Management client workspace](docs/screenshots/clients-v0.3.5.jpg)

</details>

<details>
<summary><strong>Calendar</strong></summary>

![HPC Client Management appointment calendar](docs/screenshots/calendar-v0.3.5.jpg)

</details>

<details>
<summary><strong>Status Board</strong></summary>

![HPC Client Management appointment status board](docs/screenshots/calendar-status-board-v0.3.5.jpg)

</details>

<details>
<summary><strong>My Availability</strong></summary>

![HPC Client Management clinician availability](docs/screenshots/calendar-my-availability-v0.3.5.jpg)

</details>

<details>
<summary><strong>Team Availability</strong></summary>

![HPC Client Management team availability](docs/screenshots/calendar-team-availability-v0.3.5.jpg)

</details>

<details>
<summary><strong>Clinic Setup</strong></summary>

![HPC Client Management clinic calendar setup](docs/screenshots/calendar-clinic-setup-v0.3.5.jpg)

</details>

<details>
<summary><strong>Analytics</strong></summary>

![HPC Client Management analytics](docs/screenshots/analytics-v0.3.5.jpg)

</details>

<details>
<summary><strong>Care Team</strong></summary>

![HPC Client Management Care Team](docs/screenshots/care-team-v0.3.5.jpg)

</details>

<details>
<summary><strong>Settings</strong></summary>

![HPC Client Management settings](docs/screenshots/settings-v0.3.5.jpg)

</details>

<details>
<summary><strong>About</strong></summary>

![HPC Client Management About page and signed updater](docs/screenshots/about-v0.3.5.jpg)

</details>

<details>
<summary><strong>Profile</strong></summary>

![Historical version 0.3.5 profile with MFA controls, removed in 0.3.6](docs/screenshots/profile-v0.3.5.jpg)

</details>

## Access model

| Role | Access summary |
| --- | --- |
| Admin | Clinic-wide access, Staff scheduling controls, calendar setup, account administration, backup restore, and system activity review |
| Psychologist / Counselor | Assigned clients, own calendar and availability, personal dashboard and analytics, and the care-team directory |
| Staff | Clinic-wide booking and appointment operations without authority over calendar setup, Admin accounts, backup restoration, or the system log |

## Public-source boundary

This repository is a privacy-safe source snapshot. It contains no clinic data,
real clinic branding, clinic contact details, live Supabase project references,
updater endpoints, signing material, deployment credentials, private backups,
or unredacted operational screenshots. The published screenshots were reviewed
and deliberately blurred; names and contact details in tests and examples are
fictional.

The deployed clinic application is configured separately with local environment
values and private operational assets. Those values are intentionally not
recoverable from this repository.

## Documentation

- [Version 0.3.8 user guide](docs/user-guide-0.3.8.md): sign-in, role permissions,
  records, appointments, administration, and updates
- [Release history](CHANGELOG.md): stable milestones
- [Authentication and rollout requirements](docs/authentication.md)
- [Appointment Calendar architecture](docs/appointment-calendar.md)
- [Supabase migration runbook](docs/supabase-migration-runbook.md)
- [Post-migration verification](docs/supabase-post-migration-verification.sql)
- [Appointment Calendar verification](docs/verify-appointment-calendar.sql)
- [Database-hardening verification](docs/verify-database-hardening.sql)
- [Authentication-trigger verification](docs/verify-live-auth-triggers.sql)
- [Version 0.3.7 export guide](docs/user-guide-0.3.7.md)
- [Historical version 0.3.5 user guide](docs/user-guide-0.3.5.md)

## Developer setup

### Technology

| Layer | Technology |
| --- | --- |
| Desktop | Tauri 2 and Rust |
| Interface | React 19, TypeScript, and Vite 7 |
| Backend | Supabase Auth, Postgres, Storage, Row Level Security, and Edge Functions |
| Reporting | Recharts and PptxGenJS |

### Repository structure

```text
src/                  React application and feature modules
src-tauri/            Tauri desktop shell and generic configuration
supabase/migrations/  Database baseline migrations
supabase/functions/   Server-side Edge Functions
supabase/email-templates/ Generic authentication email templates
docs/                 User guides, approved screenshots, and verification files
public/               Generic application assets
tests/                Role, workflow, security, calendar, and privacy checks
```

### Requirements

- Node.js 22 and npm (matching GitHub CI)
- Rust and the Windows prerequisites for Tauri
- A Supabase project
- Supabase CLI for migration and Edge Function deployment

### Configure the application

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `env.example` to `.env.local`.

3. Add the URL and publishable key for your own Supabase project:

   ```text
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

4. Replace the fictional clinic defaults and generic assets only in your private
   deployment configuration. Never commit secret or identifying values.

### Run locally

```bash
npm run dev
```

For the desktop shell:

```bash
npm run tauri dev
```

### Validate and build

Run these checks sequentially:

```bash
npm run lint -- --max-warnings=0
npm test
npm run build
npm run tauri build
```

The public Tauri configuration intentionally has no live updater endpoint. An
operator must configure private updater settings outside public source before
building a deployable signed release.

### Supabase setup

Apply the migrations in `supabase/migrations/` to a new Supabase project in
timestamp order, deploy the Edge Functions, configure server-side secrets, and
run the verification queries. Review Supabase Data API exposure and grants as
well as row-level-security policies before using the application with any real
records.

See the [migration runbook](docs/supabase-migration-runbook.md) for the generic
setup sequence.

## Data handling

Runtime credentials and clinical data do not belong in Git. Frontend-safe
configuration belongs in an untracked `.env.local`; service credentials belong
in Supabase project secrets. Backup exports and uploaded clinical files must
remain in approved private storage.

## License

Copyright (c) 2026 Reynato "Kirk" Republica. All rights reserved. See
[`LICENSE`](LICENSE) for the portfolio-source and reuse boundary.

For vulnerability-reporting guidance, see [`SECURITY.md`](SECURITY.md).
