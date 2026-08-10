# HPC Client Management

HPC Client Management is a Windows desktop application for managing clinic client records, clinical documentation, care-team access, analytics, and day-to-day administrative workflows.

**Current version:** 0.2.2 · **Platform:** Windows desktop · **Availability:** Private clinic deployment

The application is currently in limited clinic testing.

## Core capabilities

- Centralized client intake and record management
- 4Ps case conceptualization across biological, psychological, and social factors
- Clinician-reviewed narrative drafting for completed 4Ps records
- C-SSRS assessment workflow and follow-up indicators
- Progress notes, documents, and assessment uploads
- Dashboard priorities and clinic-wide analytics
- CSV and PowerPoint exports
- Email-invited care-team accounts, role-based access, and representative assignments
- Required multi-factor authentication, idle-session locking, and audit history
- Clinic announcements, editable contact details, themes, and client categories
- Structured backup export and Admin-confirmed merge restore
- Authenticated, privately distributed, cryptographically signed application updates

## Access model

| Role | Access summary |
| --- | --- |
| Admin | Clinic-wide access, account administration, backup restore, and system activity review |
| Psychologist / Counselor | Assigned clients, personal dashboard and analytics, the care-team directory, and permitted clinic display settings |
| Staff | Clinic-wide operational workflows without authority over Admin accounts, backup restoration, or the system log |

## Application tour

The screenshots below use staging test records. Clinic-specific branding and identifying information have been blurred.

![HPC Client Management dashboard](docs/screenshots/dashboard-v0.2.2.jpg)

<details>
<summary><strong>Client workspace</strong></summary>

![HPC Client Management client workspace](docs/screenshots/clients-v0.2.2.jpg)

</details>

<details>
<summary><strong>4Ps case conceptualization</strong></summary>

![HPC Client Management 4Ps case conceptualization](docs/screenshots/case-conceptualization-v0.2.2.jpg)

</details>

<details>
<summary><strong>Analytics and reporting</strong></summary>

![HPC Client Management analytics](docs/screenshots/analytics-v0.2.2.jpg)

</details>

<details>
<summary><strong>Care Team</strong></summary>

![HPC Client Management Care Team](docs/screenshots/care-team-v0.2.2.jpg)

</details>

<details>
<summary><strong>Settings, backup, and audit activity</strong></summary>

![HPC Client Management settings](docs/screenshots/settings-v0.2.2.jpg)

</details>

<details>
<summary><strong>Profile and multi-factor authentication</strong></summary>

![HPC Client Management profile and MFA settings](docs/screenshots/profile-v0.2.2.jpg)

</details>

<details>
<summary><strong>About and signed updates</strong></summary>

![HPC Client Management About page and signed updater](docs/screenshots/about-v0.2.2.jpg)

</details>

<details>
<summary><strong>Sign in</strong></summary>

![HPC Client Management sign-in screen](docs/screenshots/login-v0.2.2.jpg)

</details>

## Technology

| Layer | Technology |
| --- | --- |
| Desktop | Tauri 2 and Rust |
| Interface | React 19, TypeScript, and Vite 7 |
| Backend | Supabase Auth, Postgres, Storage, Row Level Security, and Edge Functions |
| Reporting | Recharts and PptxGenJS |

## Repository structure

```text
src/                  React application and feature modules
src-tauri/            Tauri desktop shell and configuration
supabase/migrations/  Database baseline migrations
supabase/functions/   Server-side Edge Functions
docs/                 Deployment notes, verification queries, and screenshots
public/               Application assets
scripts/              Build, backup, cutover, signing, and release utilities
```

Local environment values, dependencies, generated builds, installers, Rust build output, uploaded files, and backup exports are excluded from source control.

## Getting started

### Requirements

- Node.js and npm
- Rust and the Windows prerequisites for Tauri
- A Supabase project
- Supabase CLI for migration and Edge Function deployment

### Configure the application

1. Install the JavaScript dependencies:

   ```bash
   npm ci
   ```

2. Copy `env.example` to `.env.local` and add the frontend configuration for the target Supabase project:

   ```text
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

3. Add any optional session, upload, or update settings described in `env.example`.

### Run locally

Start the web interface:

```bash
npm run dev
```

Start the desktop application:

```bash
npm run tauri dev
```

### Validate and build

```bash
npm run lint -- --max-warnings=0
npm test
npm run build
npm run tauri build
```

## Supabase setup

The migration baseline in `supabase/migrations/` is designed for a fresh Supabase project. Apply the migrations in timestamp order, deploy the Edge Functions, configure their server-side secrets, and run the verification queries.

See the [Supabase migration runbook](docs/supabase-migration-runbook.md) for the complete sequence.

## Documentation

- [HPC Client Management 0.2.2 user guide](docs/user-guide-0.2.2.md)
- [Printable 0.2.2 user guide](docs/HPC_Client_Management_0.2.2_User_Guide.docx)
- [Release history](CHANGELOG.md)
- [Supabase migration runbook](docs/supabase-migration-runbook.md)
- [Deployment and secrets checklist](docs/deployment-secrets-checklist.md)
- [Post-migration verification queries](docs/supabase-post-migration-verification.sql)
- [Live authentication trigger verification](docs/verify-live-auth-triggers.sql)
- [Production 0.2.2 cutover procedure](docs/production-0.2.2-cutover.md)
- [Staging security verification](docs/staging-security-verification.md)

## Data handling

Runtime credentials and clinical data are not stored in this repository. Frontend-safe configuration belongs in an untracked `.env.local`; server credentials belong in Supabase project secrets. Backup exports and uploaded clinical files should remain in approved storage locations.

## License

All rights reserved.
