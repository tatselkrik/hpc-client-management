# HPC Client Management — Supabase Migration Runbook

Generated from the live Supabase CSV exports supplied on 4 May 2026.

## Purpose

These files are a canonical baseline for a **new/fresh Supabase project**. They are not meant to be run blindly against the current live project.

## Migration order

Run the files in this exact order:

1. `supabase/migrations/20260504000100_base_tables_constraints_indexes.sql`
2. `supabase/migrations/20260504000200_public_functions.sql`
3. `supabase/migrations/20260504000300_public_triggers.sql`
4. `supabase/migrations/20260504000400_rls_policies.sql`
5. `supabase/migrations/20260504000500_storage_buckets.sql`
6. `supabase/migrations/20260504000600_seed_defaults.sql`
7. `supabase/migrations/20260807000100_security_hardening.sql`
8. `supabase/migrations/20260809000100_edge_function_service_grants.sql`

## Important notes

- The exported views/materialized views result was confirmed empty.
- No custom enum types were found. The type export only showed table composite row types.
- Storage system table definitions are intentionally not recreated. Supabase owns the `storage` schema.
- Storage bucket rows are upserted separately.
- Only the standard default client categories are seeded: `Bago`, `Himamaylan`, and `Cauayan`.
- Live/admin-created categories from the export such as `Capuchin`, `Clinic`, and `Silay` are intentionally excluded from seed defaults.
- Auth schema triggers were verified separately from the live project and are included in `20260504000300_public_triggers.sql`:
  - `on_auth_user_created_profile` on `auth.users` after insert → `public.handle_new_user_profile()`
  - `hpc_sync_profile_email_after_auth_update` on `auth.users` after update → `public.hpc_sync_profile_email_from_auth()`

## Applying without Docker

Since Docker Desktop was unavailable on the source machine, the safest no-Docker path is:

1. Create a fresh Supabase project.
2. Open Supabase Dashboard → SQL Editor.
3. Run each migration file in order.
4. Deploy Edge Functions.
5. Set Edge Function secrets.
6. Run the verification queries in `docs/supabase-post-migration-verification.sql`.

## Applying with Supabase CLI

When Docker Desktop is available:

```bash
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase db push
```

Do not use `db push` against the current live project unless you have reviewed the diff and have a verified backup.

## Edge Functions to deploy

Deploy the functions from the app repo:

```bash
supabase functions deploy generate-4ps-narrative
supabase functions deploy invite-care-team-member
supabase functions deploy remove-care-team-member
supabase functions deploy update-care-team-member-role
supabase functions deploy validate-upload
supabase functions deploy check-app-update
supabase functions deploy restore-clinic-backup
```

## Required Edge Function secrets

Set these in the target Supabase project. Do not commit values.

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEMINI_MODEL
CARE_TEAM_INVITE_REDIRECT_URL
HPC_ALLOWED_CORS_ORIGINS
ALLOWED_CORS_ORIGINS
```

`GEMINI_MODEL`, `HPC_ALLOWED_CORS_ORIGINS`, and `ALLOWED_CORS_ORIGINS` are optional depending on deployment choices. `CARE_TEAM_INVITE_REDIRECT_URL` is required for email invitations and should be set to `hpc-client-management://auth/invite` for the installed Windows app.

## Post-migration manual checks

After applying migrations and deploying functions, test:

- Profile creation / Care Team invite flow
- Admin, Psychologist / Counselor, and Staff role matrix
- Staff denial when creating, promoting, editing, or deactivating an Admin
- Deactivated user access denial and retained account history
- Client CRUD and representative scoping
- C-SSRS access for Admin, assigned Psychologist / Counselor, and Staff
- 4Ps narrative generation for Admin and the assigned Psychologist / Counselor only
- Mandatory MFA before clinical or operational access
- Document/Assessment upload, download, rename, delete permissions
- Profile picture upload/remove
- Analytics export
- Backup export, package review, and Admin merge restore
- Editable clinic information
- Secure release-channel update check

## Current known release gaps

- Upload from Phone is deferred. Both its frontend and server feature flags must remain
  disabled until the separate phone page, hosting, privacy review, and end-to-end upload
  security tests are complete. Desktop document and assessment uploads remain supported.
- Free-tier Gemini data handling remains unresolved for real clinical information. Users
  must not submit client names or other identifying information through 4Ps narrative
  generation until the clinic approves the provider's data-handling arrangement.
- The migration package was verified on the disposable staging project. Production transfer
  still requires a reviewed database backup, migration diff, and deployment sign-off.
