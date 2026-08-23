-- Staging verification for the HPC Client Management 0.3.4 hardening.
-- Structural checks are read-only. Behavioral writes run inside a transaction
-- that is always rolled back.

do $verification$
declare
  missing_indexes text[];
  duplicate_policy_count integer;
begin
  if exists (
    select 1
    from pg_proc procedures
    join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.prosecdef
      and (
        has_function_privilege('anon', procedures.oid, 'execute')
        or has_function_privilege('authenticated', procedures.oid, 'execute')
      )
  ) then
    raise exception 'An exposed SECURITY DEFINER function is still executable by an API role.';
  end if;

  if exists (
    select 1
    from pg_proc procedures
    join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname in ('public', 'hpc_private')
      and procedures.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(procedures.proconfig, array[]::text[])) as setting(value)
        where setting.value like 'search_path=%'
      )
  ) then
    raise exception 'A privileged function has no reviewed search_path.';
  end if;

  if (
    select count(*)
    from pg_proc procedures
    join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'hpc_private'
      and procedures.prosecdef
  ) < 20 then
    raise exception 'The private RLS helper set is incomplete.';
  end if;

  if not has_schema_privilege('authenticated', 'hpc_private', 'usage')
     or has_schema_privilege('anon', 'hpc_private', 'usage') then
    raise exception 'The private helper schema grants are incorrect.';
  end if;

  if (
    select procedures.prosecdef
    from pg_proc procedures
    where procedures.oid = 'public.log_audit_event(text,text,text,text,text,jsonb)'::regprocedure
  ) then
    raise exception 'The client audit RPC is still SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_trigger triggers
    where triggers.tgname = 'hpc_stamp_client_audit_event'
      and triggers.tgrelid = 'public.audit_logs'::regclass
      and not triggers.tgisinternal
  ) then
    raise exception 'The client audit identity-stamping trigger is missing.';
  end if;

  select count(*)
  into duplicate_policy_count
  from (
    select
      policies.schemaname,
      policies.tablename,
      policies.roles,
      policies.cmd
    from pg_policies policies
    where policies.permissive = 'PERMISSIVE'
      and policies.schemaname = 'public'
      and policies.tablename in (
        'client_4ps',
        'client_assessments',
        'client_categories',
        'client_children',
        'client_cssrs',
        'client_documents',
        'clients',
        'mobile_upload_sessions',
        'profiles',
        'progress_notes'
      )
    group by
      policies.schemaname,
      policies.tablename,
      policies.roles,
      policies.cmd
    having count(*) > 1
  ) duplicates;

  if duplicate_policy_count <> 0 then
    raise exception 'Overlapping permissive policies remain: %.', duplicate_policy_count;
  end if;

  select array_agg(expected.index_name order by expected.index_name)
  into missing_indexes
  from unnest(array[
    'client_4ps_narrative_generated_by_idx',
    'client_4ps_updated_by_idx',
    'client_assessments_created_by_idx',
    'client_cssrs_created_by_idx',
    'client_documents_created_by_idx',
    'clients_created_by_idx',
    'clinic_settings_updated_by_idx',
    'dashboard_announcements_created_by_idx',
    'mobile_upload_sessions_created_by_idx',
    'progress_notes_created_by_idx'
  ]) as expected(index_name)
  where to_regclass('public.' || expected.index_name) is null;

  if missing_indexes is not null then
    raise exception 'Missing hardening indexes: %.', missing_indexes;
  end if;
end;
$verification$;

begin;

create temporary table hardening_expected_counts (
  metric text primary key,
  expected_count bigint not null
) on commit drop;

insert into hardening_expected_counts (metric, expected_count)
values
  ('all_clients', (select count(*) from public.clients)),
  ('all_profiles', (select count(*) from public.profiles where is_active));

grant select on hardening_expected_counts to authenticated;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', profiles.id,
    'role', 'authenticated',
    'aal', 'aal2',
    'email', coalesce(profiles.email, 'staging-admin@example.invalid')
  )::text,
  true
)
from public.profiles
where public.hpc_normalized_role(profiles.role) = 'admin'
  and profiles.is_active
order by profiles.created_at
limit 1;

set local role authenticated;

do $admin_behavior$
declare
  audit_row public.audit_logs;
begin
  if (select count(*) from public.clients) <>
     (select expected_count from hardening_expected_counts where metric = 'all_clients') then
    raise exception 'Admin no longer sees the complete client roster.';
  end if;

  if (select count(*) from public.clinic_settings) <> 1 then
    raise exception 'Admin no longer sees clinic settings.';
  end if;

  audit_row := public.log_audit_event(
    'Verification',
    'Hardening rollback test',
    'hardening',
    null,
    'Rollback-only staging verification',
    jsonb_build_object('verification', true)
  );

  if audit_row.actor_user_id <> auth.uid()
     or audit_row.created_at < now() - interval '1 minute'
     or audit_row.details ->> 'source' <> 'client_reported' then
    raise exception 'Client audit identity or server time was not stamped correctly.';
  end if;
end;
$admin_behavior$;

reset role;
set local role postgres;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', profiles.id,
    'role', 'authenticated',
    'aal', 'aal2',
    'email', coalesce(profiles.email, 'staging-staff@example.invalid')
  )::text,
  true
)
from public.profiles
where public.hpc_normalized_role(profiles.role) = 'staff'
  and profiles.is_active
order by profiles.created_at
limit 1;

set local role authenticated;

do $staff_behavior$
begin
  if auth.uid() is not null
     and (select count(*) from public.clients) <>
         (select expected_count from hardening_expected_counts where metric = 'all_clients') then
    raise exception 'Staff no longer sees the complete client roster.';
  end if;
end;
$staff_behavior$;

reset role;
set local role postgres;

create temporary table hardening_clinician_expected (
  profile_id uuid primary key,
  representative_name text not null,
  client_count bigint not null
) on commit drop;

insert into hardening_clinician_expected (
  profile_id,
  representative_name,
  client_count
)
select
  profiles.id,
  btrim(profiles.hpc_representative_name),
  (
    select count(*)
    from public.clients
    where lower(btrim(coalesce(clients.hpc_representative, ''))) =
          lower(btrim(profiles.hpc_representative_name))
  )
from public.profiles
where profiles.is_active
  and nullif(btrim(coalesce(profiles.hpc_representative_name, '')), '') is not null
order by profiles.created_at
limit 1;

grant select on hardening_clinician_expected to authenticated;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', expected.profile_id,
    'role', 'authenticated',
    'aal', 'aal2',
    'email', 'staging-clinician@example.invalid'
  )::text,
  true
)
from hardening_clinician_expected expected;

set local role authenticated;

do $clinician_behavior$
begin
  if auth.uid() is null then
    raise exception 'Staging needs an active clinician for role verification.';
  end if;

  if (select count(*) from public.clients) <>
     (select client_count from hardening_clinician_expected) then
    raise exception 'Clinician client visibility no longer matches the HPC assignment.';
  end if;
end;
$clinician_behavior$;

reset role;
set local role postgres;
set local role anon;

do $anonymous_behavior$
declare
  execution_denied boolean := false;
begin
  begin
    perform public.is_admin_profile();
  exception when insufficient_privilege then
    execution_denied := true;
  end;

  if not execution_denied then
    raise exception 'Anonymous execution of a privileged public helper was not denied.';
  end if;
end;
$anonymous_behavior$;

reset role;
rollback;

select
  'advisor_hardening_0_3_4_verified' as verification,
  (
    select count(*)
    from pg_proc procedures
    join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'hpc_private'
      and procedures.prosecdef
  ) as private_helper_count,
  (
    select count(*)
    from pg_proc procedures
    join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.prosecdef
      and (
        has_function_privilege('anon', procedures.oid, 'execute')
        or has_function_privilege('authenticated', procedures.oid, 'execute')
      )
  ) as exposed_privileged_function_count;
