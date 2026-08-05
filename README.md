# HPC Client Management

HPC Client Management is a desktop application for authorized clinic teams to manage client intake records, clinical workflows, documents, assessments, care-team access, analytics, and operational settings.

The project is a hands-on, AI-assisted build. I translated the clinic workflow into the data model and application behavior, installed and configured the toolchain, worked through the desktop and backend architecture, documented the operational process, and produced the release-candidate build and testing manual.

The application is currently undergoing limited testing with one psychologist before broader clinic use.

## Highlights

- Desktop application built with Tauri, React, and TypeScript
- Supabase authentication, profiles, role-aware access, database migrations, storage policies, and Edge Functions
- Client intake and record management
- C-SSRS workflow support
- 4Ps case conceptualization and clinician-reviewed AI narrative drafting
- Progress notes, client documents, and assessment workflows
- Analytics, drilldowns, CSV export, and PowerPoint export
- Care-team administration, MFA support, idle-session sign-out, audit logs, announcements, themes, and backup export/review
- Release-candidate user guide, role matrix, manual test plan, migration runbook, and deployment checklist

## Technology

- React 19 and TypeScript
- Vite 7
- Tauri 2 and Rust
- Supabase Auth, Postgres, Storage, Row Level Security, and Edge Functions
- Recharts
- PptxGenJS

## Repository structure

```text
src/                 React application and feature modules
src-tauri/           Tauri desktop shell, configuration, and capabilities
supabase/migrations/ Canonical database baseline migrations
supabase/functions/  Server-side Edge Functions
docs/                Migration, verification, and deployment notes
public/              Application branding assets
```

Generated dependencies, web builds, Rust build output, installers, local environment values, and migration archives are intentionally excluded from Git.

## Local setup

### Prerequisites

- Node.js and npm
- Rust toolchain and the Tauri prerequisites for Windows
- A Supabase project for backend functionality
- Supabase CLI when deploying migrations or Edge Functions

### Configure and run the frontend

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `env.example` to `.env.local` and provide the target project's frontend-safe values. Never place service-role keys, database passwords, or AI provider secrets in frontend environment files.

3. Start development:

   ```bash
   npm run dev
   ```

### Run the desktop application

```bash
npm run tauri dev
```

### Quality checks

```bash
npm run lint -- --max-warnings=0
npm run build
```

### Build the desktop installer

```bash
npm run tauri build
```

## Backend setup

The migration baseline is intended for a new Supabase project. Review and apply the files in `supabase/migrations/` in timestamp order, deploy the Edge Functions, configure server-side secrets in Supabase, and then run the verification queries in `docs/`.

Do not apply the baseline blindly to an existing live project.

## Documentation

- `docs/supabase-migration-runbook.md` - database migration order and deployment workflow
- `docs/deployment-secrets-checklist.md` - frontend/server secret separation and release checks
- `docs/supabase-post-migration-verification.sql` - structural verification queries
- `HPC_Client_Management_v1.1.0_rc1_User_Guide_and_RC_Testing_Manual.docx` - non-technical user guide and manual role-testing plan

## Current limitations

- Backend authorization and audit-log hardening remains before production use.
- Automated role-matrix and end-to-end tests have not yet been added; the current RC manual provides manual test coverage.
- Backup restore is review-only and does not apply a production database restore.
- Installer code signing and the final update/distribution workflow are pending.
- Application and installer version metadata must be consolidated before the next release.

## Privacy and responsible use

This project models sensitive clinical workflows. The repository must not contain real client records, uploaded clinical files, production secrets, service-role credentials, database passwords, or private backup exports.

## License

No open-source license has been granted. All rights are reserved unless a license is added later.
