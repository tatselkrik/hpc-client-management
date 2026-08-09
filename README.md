# HPC Client Management

HPC Client Management is a Windows desktop application for managing clinic client records, clinical documentation, care-team access, analytics, and day-to-day administrative workflows.

The application is currently in limited clinic testing with one psychologist.

![HPC Client Management dashboard with identifying information redacted](docs/screenshots/dashboard.webp)

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
- Structured backup export, Admin-confirmed merge restore, and release update checks

## Application tour

The screenshots below were captured from the working desktop build. Clinic branding and identifying information have been redacted.

| Case conceptualization | Analytics |
| --- | --- |
| ![4Ps case conceptualization screen](docs/screenshots/case-conceptualization.webp) | ![Analytics filters and summary metrics](docs/screenshots/analytics.webp) |

| Care-team administration | Clinic administration |
| --- | --- |
| ![Care-team roles and account creation](docs/screenshots/care-team.webp) | ![Client categories and clinic administration tools](docs/screenshots/administration.webp) |

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

- [Release history](CHANGELOG.md)
- [Supabase migration runbook](docs/supabase-migration-runbook.md)
- [Deployment and secrets checklist](docs/deployment-secrets-checklist.md)
- [Post-migration verification queries](docs/supabase-post-migration-verification.sql)
- [Live authentication trigger verification](docs/verify-live-auth-triggers.sql)
- [User guide and release-candidate testing manual](HPC_Client_Management_v1.1.0_rc1_User_Guide_and_RC_Testing_Manual.docx)

## Data handling

Runtime credentials and clinical data are not stored in this repository. Frontend-safe configuration belongs in an untracked `.env.local`; server credentials belong in Supabase project secrets. Backup exports and uploaded clinical files should remain in approved storage locations.

## License

All rights reserved.
