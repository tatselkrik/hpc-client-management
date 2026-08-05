-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- Storage buckets captured from live project.
-- Supabase manages storage schema tables. This migration only upserts bucket rows.
-- Storage object RLS policies are defined in 20260504000400_rls_policies.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-assessments', 'client-assessments', false, null, null)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, null, null)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-pictures', 'profile-pictures', false, null, null)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-assets', 'public-assets', true, null, null)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

