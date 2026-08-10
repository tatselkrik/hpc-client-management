# HPC Client Management â€” Supabase Migration Runbook

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
9. `supabase/migrations/20260809000200_staff_client_assignment_permissions.sql`
10. `supabase/migrations/20260809000300_assign_admin_representative.sql`
11. `supabase/migrations/20260809000400_inactive_profile_status_message.sql`
12. `supabase/migrations/20260809000500_experience_improvements.sql`
13. `supabase/migrations/20260810000300_private_app_updates.sql`

Release-publication migrations are environment-specific:

- `20260810000100_publish_staging_0_2_0.sql` is for staging only.
- `20260810000400_publish_production_0_2_2.sql` is for the coordinated
  production cutover only.

## Important notes

- The exported views/materialized views result was confirmed empty.
- No custom enum types were found. The type export only showed table composite row types.
- Storage system table definitions are intentionally not recreated. Supabase owns the `storage` schema.
- Storage bucket rows are upserted separately.
- Only the standard default client categories are seeded: `Bago`, `Himamaylan`, and `Cauayan`.
- Live/admin-created categories from the export such as `Capuchin`, `Clinic`, and `Silay` are intentionally excluded from seed defaults.
- Auth schema triggers were verified separately from the live project and are included in `20260504000300_public_triggers.sql`:
  - `on_auth_user_created_profile` on `auth.users` after insert â†’ `public.handle_new_user_profile()`
  - `hpc_sync_profile_email_after_auth_update` on `auth.users` after update â†’ `public.hpc_sync_profile_email_from_auth()`

## Applying without Docker

Since Docker Desktop was unavailable on the source machine, the safest no-Docker path is:

1. Create a fresh Supabase project.
2. Open Supabase Dashboard â†’ SQL Editor.
3. Run each migration file in order.
4. Deploy Edge Functions.
5. Set Edge Function secrets.
6. Run the verification queries in `docs/supabase-post-migration-verification.sql`.

## Applying a fresh remote project with Supabase CLI

Docker is not required to link to a hosted project or run `db push`. Docker (or
another compatible container runtime) is required only for commands that start
or compare against the local Supabase stack, such as `supabase start` and a
local `db reset`.

```bash
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase db push
```

Do not use `db push` against the current live project. Version 1 was created
manually and has no migration-history table. Follow
`docs/production-0.2.2-cutover.md`, create a verified database and Storage
backup, apply only the reviewed post-baseline files, and then repair migration
history.

## Edge Functions to deploy

Deploy the functions from the app repo:

```bash
supabase functions deploy generate-4ps-narrative
supabase functions deploy invite-care-team-member
supabase functions deploy remove-care-team-member
supabase functions deploy update-care-team-member-role
supabase functions deploy validate-upload
supabase functions deploy check-app-update
supabase functions deploy app-updater
supabase functions deploy restore-clinic-backup
```

## Edge Function environment

Supabase supplies these hosted Edge Function variables automatically. Confirm
that they are available, but do not copy their values into the repository:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Set the following application secrets in the target project. Do not commit
their values:

```text
GEMINI_API_KEY
GEMINI_MODEL
CARE_TEAM_INVITE_REDIRECT_URL
MOBILE_UPLOAD_ENABLED
HPC_ALLOWED_CORS_ORIGINS
ALLOWED_CORS_ORIGINS
```

`GEMINI_MODEL`, `HPC_ALLOWED_CORS_ORIGINS`, and `ALLOWED_CORS_ORIGINS` are
optional depending on deployment choices. `CARE_TEAM_INVITE_REDIRECT_URL` is
required for email invitations and should be
`hpc-client-management://auth/invite` for the production Windows app or
`hpc-client-management-staging://auth/invite` for staging.

`MOBILE_UPLOAD_ENABLED` must remain `false` while Upload from Phone is deferred.

## Post-migration manual checks

After applying migrations and deploying functions, test:

- Profile creation / Care Team invite flow
- Admin, Psychologist / Counselor, and Staff role matrix
- Staff denial when creating, promoting, editing, or deactivating an Admin
- Deactivated user access denial and retained account history
- Client creation, overview editing, deletion, and representative scoping for each role
- C-SSRS editing for Admin and the assigned Psychologist / Counselor; Staff
  overview access must not grant clinical editing
- 4Ps narrative generation for Admin and the assigned Psychologist / Counselor only
- Mandatory MFA before clinical or operational access
- Document/Assessment upload, download, and rename for all approved roles;
  deletion only for Admin and the assigned Psychologist / Counselor
- Profile picture upload/remove
- Analytics export
- Backup export, package review, and Admin merge restore
- Editable clinic information
- Private signed release check, installation, and restart

## Current known release gaps

- Upload from Phone is deferred. Both its frontend and server feature flags must remain
  disabled until the separate phone page, hosting, privacy review, and end-to-end upload
  security tests are complete. Desktop document and assessment uploads remain supported.
- Free-tier Gemini data handling remains unresolved for real clinical information. Users
  must not submit client names or other identifying information through 4Ps narrative
  generation until the clinic approves the provider's data-handling arrangement.
- The migration package was verified on the disposable staging project. Production transfer
  still requires a reviewed database backup, migration diff, and deployment sign-off.
