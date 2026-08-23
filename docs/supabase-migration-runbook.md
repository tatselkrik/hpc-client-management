# Supabase migration runbook

This public runbook describes a generic installation into a new Supabase
project. It intentionally contains no live project reference, database
credential, deployment endpoint, clinic identity, or private updater setting.

## Before migration

1. Create a separate nonproduction Supabase project.
2. Confirm that no real client information will be used for verification.
3. Install the current Supabase CLI and discover commands with `--help`.
4. Authenticate locally without committing access tokens or project metadata.
5. Review Data API exposure settings. Explicit grants and Row Level Security are
   separate requirements and must both match the intended access model.

## Apply the schema

1. Link the CLI to your nonproduction project locally.
2. Apply the files in `supabase/migrations/` in timestamp order.
3. Deploy the Edge Functions in `supabase/functions/`.
4. Configure application-specific Edge Function secrets in Supabase. Never put
   service-role or secret keys in frontend environment files.
5. Configure the generic authentication email templates for your own clinic.

## Verify

Run the read-only checks first, then the rollback-only behavioral checks:

1. `docs/deployment-preflight-readonly.sql`
2. `docs/supabase-post-migration-verification.sql`
3. `docs/verify-appointment-calendar.sql`
4. `docs/verify-database-hardening.sql`
5. `docs/verify-live-auth-triggers.sql`

Also run the Supabase database linter and database advisors. Review every
warning in the context of the intended access model; do not weaken Row Level
Security merely to clear a notice.

## Application configuration

Copy `env.example` to an untracked `.env.local` and provide only your own
project URL and frontend-safe publishable key. Configure clinic identity and
contact values locally. Server credentials remain in Supabase project secrets.

The public Tauri configuration has no live updater endpoint or signing key.
Private release distribution requires a separately reviewed operator process.

## Production promotion

Before applying a tested migration to a production clinic project:

1. Take a fresh, verified database and Storage backup.
2. Confirm the exact target project and migration list.
3. Document rollback or recovery steps.
4. Apply the tested migrations once; never rerun a committed migration merely
   to repair migration history.
5. Repeat the read-only and behavioral verification.
6. Confirm role boundaries, MFA enforcement, audit history, backup restoration,
   and appointment conflict prevention with fictional records before normal use.
