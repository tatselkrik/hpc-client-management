\set ON_ERROR_STOP on
\pset pager off

-- Read-only deployment preflight for HPC Client Management.
-- This script returns counts and configuration metadata only. It does not
-- select client names, email addresses, clinical content, or file names.

begin transaction read only;

select
  current_database() as database_name,
  current_setting('server_version') as postgres_version,
  now() as checked_at;

select
  table_name,
  row_count
from (
  select 'profiles'::text, count(*)::bigint from public.profiles
  union all select 'clients', count(*) from public.clients
  union all select 'client_children', count(*) from public.client_children
  union all select 'client_4ps', count(*) from public.client_4ps
  union all select 'client_cssrs', count(*) from public.client_cssrs
  union all select 'progress_notes', count(*) from public.progress_notes
  union all select 'client_documents', count(*) from public.client_documents
  union all select 'client_assessments', count(*) from public.client_assessments
  union all select 'client_categories', count(*) from public.client_categories
  union all select 'dashboard_announcements', count(*) from public.dashboard_announcements
  union all select 'audit_logs', count(*) from public.audit_logs
  union all select 'mobile_upload_sessions', count(*) from public.mobile_upload_sessions
  union all select 'analytics_presentation_exports', count(*) from public.analytics_presentation_exports
) as inventory(table_name, row_count)
order by table_name;

select
  coalesce(nullif(trim(role), ''), '<blank>') as role,
  is_active,
  count(*) as profile_count
from public.profiles
group by coalesce(nullif(trim(role), ''), '<blank>'), is_active
order by role, is_active desc;

select
  count(*) as auth_user_count,
  count(*) filter (where deleted_at is null) as nondeleted_auth_user_count
from auth.users;

select
  count(*) filter (where status = 'verified') as verified_factor_count,
  count(distinct user_id) filter (where status = 'verified') as users_with_verified_mfa
from auth.mfa_factors;

select
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name, event_manipulation;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select
  schemaname,
  tablename,
  count(*) as policy_count
from pg_policies
where schemaname in ('public', 'storage')
group by schemaname, tablename
order by schemaname, tablename;

select
  bucket.id as bucket_id,
  bucket.public,
  count(object.id) as object_count,
  coalesce(sum((object.metadata ->> 'size')::bigint), 0) as total_object_bytes
from storage.buckets as bucket
left join storage.objects as object
  on object.bucket_id = bucket.id
group by bucket.id, bucket.public
order by bucket.id;

select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'supabase_migrations'
      and table_name = 'schema_migrations'
  ) as migration_history_table_exists;

rollback;
