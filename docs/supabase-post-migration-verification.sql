-- HPC Client Management post-migration verification queries

-- 1) Tables and RLS status
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind = 'r'
  and (
    n.nspname = 'public'
    or (n.nspname = 'storage' and c.relname in ('objects', 'buckets'))
  )
order by n.nspname, c.relname;

-- 2) Public function count and names
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, identity_arguments;

-- 3) Policies
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 4) Public triggers
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema in ('public', 'auth')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;

-- 5) Storage buckets
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in (
  'app-updates',
  'client-documents',
  'client-assessments',
  'profile-pictures',
  'public-assets'
)
order by id;

-- 6) Seeded default categories
select name
from public.client_categories
order by name;

-- 7) Approved role migration. This result must contain only the three approved roles.
select role, is_active, count(*) as account_count
from public.profiles
group by role, is_active
order by role, is_active desc;

-- 8) No legacy CEO or Intern account should remain active.
select id, email, role, is_active
from public.profiles
where lower(trim(role)) in ('ceo', 'intern')
   or role not in ('Admin', 'Psychologist / Counselor', 'Staff');

-- 9) New profiles must default to inactive until created through the invitation service.
select column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'is_active';

-- 10) Authenticated clients must not have direct audit-write privileges.
select
  has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.audit_logs', 'DELETE') as can_delete;

-- 11) Protected Edge Functions need explicit access when automatic table exposure is off.
select
  has_table_privilege('service_role', 'public.profiles', 'SELECT') as profiles_select,
  has_table_privilege('service_role', 'public.profiles', 'INSERT') as profiles_insert,
  has_table_privilege('service_role', 'public.profiles', 'UPDATE') as profiles_update,
  has_table_privilege('service_role', 'public.audit_logs', 'INSERT') as audit_insert,
  has_table_privilege('service_role', 'public.clients', 'SELECT') as clients_select,
  has_table_privilege('service_role', 'public.mobile_upload_sessions', 'SELECT') as sessions_select,
  has_table_privilege('service_role', 'public.mobile_upload_sessions', 'UPDATE') as sessions_update,
  has_table_privilege('service_role', 'public.client_documents', 'INSERT') as documents_insert,
  has_table_privilege('service_role', 'public.client_assessments', 'INSERT') as assessments_insert;

-- 12) Experience-improvement services and singleton clinic settings.
select id, mobile_number, landline_number, email, address, updated_at
from public.clinic_settings
where id = 1;

select channel, version, is_active, published_at
from public.app_releases
order by channel, published_at desc;

select
  has_function_privilege(
    'authenticated',
    'public.hpc_restore_backup_service(jsonb, uuid)',
    'EXECUTE'
  ) as authenticated_can_restore,
  has_function_privilege(
    'service_role',
    'public.hpc_restore_backup_service(jsonb, uuid)',
    'EXECUTE'
  ) as service_role_can_restore;

-- Expected: authenticated_can_restore = false and service_role_can_restore = true.

-- 13) Private updater tables and grants.
select
  has_table_privilege(
    'authenticated',
    'public.app_release_artifacts',
    'SELECT'
  ) as authenticated_can_read_artifacts,
  has_table_privilege(
    'service_role',
    'public.app_release_artifacts',
    'SELECT'
  ) as service_role_can_read_artifacts,
  has_table_privilege(
    'service_role',
    'public.app_release_artifacts',
    'INSERT'
  ) as service_role_can_publish_artifacts;

-- Expected: false, true, true.

-- 14) Active release metadata. A coordinated production cutover must have one
-- active stable 0.3.5 row. A separate nonproduction channel may have its own row.
select channel, version, count(*) as active_release_count
from public.app_releases
where is_active = true
group by channel, version
order by channel, version;

-- 15) Authenticated users must not receive a direct Storage policy for the
-- private updater bucket. Downloads are issued by the app-updater function.
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') like '%app-updates%'
    or coalesce(with_check, '') like '%app-updates%'
  )
order by policyname;

-- Expected: zero rows.
