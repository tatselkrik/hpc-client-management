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
where id in ('client-documents', 'client-assessments', 'profile-pictures', 'public-assets')
order by id;

-- 6) Seeded default categories
select name
from public.client_categories
order by name;
