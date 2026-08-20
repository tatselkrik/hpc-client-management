-- Approved HPC role model and security hardening.
-- Apply to a staging project first. This migration intentionally does not run against live automatically.

-- Keep only the approved roles. Legacy CEO accounts become Admins. Legacy Intern and
-- unknown-role accounts become inactive Staff records so their history is retained.
-- The Version 1 baseline already protects these fields with a trigger intended for
-- client sessions. Temporarily disable that trigger for this reviewed migration;
-- the surrounding cutover transaction guarantees it is restored on failure.
alter table public.profiles
  disable trigger prevent_client_profile_role_changes;

update public.profiles
set role = 'Admin'
where lower(trim(coalesce(role, ''))) in ('ceo', 'chief executive officer');

update public.profiles
set role = 'Staff',
    is_active = false
where lower(trim(coalesce(role, ''))) like '%intern%';

update public.profiles
set role = 'Admin'
where lower(trim(coalesce(role, ''))) like '%admin%';

update public.profiles
set role = 'Psychologist / Counselor'
where lower(trim(coalesce(role, ''))) in (
  'psychologist / counselor',
  'psychologist / counsellor',
  'psychologist',
  'counselor',
  'counsellor'
);

update public.profiles
set role = 'Staff'
where lower(trim(coalesce(role, ''))) = 'staff';

update public.profiles
set role = 'Staff',
    is_active = false
where role not in ('Admin', 'Psychologist / Counselor', 'Staff')
   or role is null;

alter table public.profiles
  enable trigger prevent_client_profile_role_changes;

alter table public.profiles
  alter column is_active set default false;

alter table public.profiles
  drop constraint if exists profiles_approved_role_check;

alter table public.profiles
  add constraint profiles_approved_role_check
  check (role in ('Admin', 'Psychologist / Counselor', 'Staff'));

create or replace function public.hpc_normalized_role(role_value text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when lower(trim(coalesce(role_value, ''))) in ('ceo', 'chief executive officer')
      then 'admin'
    when lower(trim(coalesce(role_value, ''))) in (
      'psychologist / counsellor',
      'psychologist',
      'counselor',
      'counsellor'
    ) then 'psychologist / counselor'
    else lower(trim(coalesce(role_value, '')))
  end;
$function$;

create or replace function public.hpc_has_required_aal()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$function$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
    'admin',
    'psychologist / counselor',
    'staff'
  ]);
$function$;

create or replace function public.is_admin_profile()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array['admin']);
$function$;

create or replace function public.hpc_profile_can_view_all_clients()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array['admin', 'staff']);
$function$;

create or replace function public.can_access_client_by_representative(client_hpc_representative text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    public.hpc_profile_can_view_all_clients()
    or (
      public.hpc_current_profile_has_role(array['psychologist / counselor'])
      and public.hpc_current_profile_representative() is not null
      and lower(trim(coalesce(client_hpc_representative, ''))) =
          lower(trim(coalesce(public.hpc_current_profile_representative(), '')))
    );
$function$;

create or replace function public.can_manage_dashboard_announcements()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
    'admin',
    'psychologist / counselor',
    'staff'
  ]);
$function$;

create or replace function public.hpc_profile_can_view_all_representative_analytics()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array['admin', 'staff']);
$function$;

create or replace function public.hpc_profile_can_write_client_clinical_records(target_client_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_profile_can_write_client_cssrs_interview(target_client_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

create or replace function public.hpc_profile_can_manage_client_documents(target_client_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

create or replace function public.hpc_profile_can_manage_client_assessments(target_client_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

-- New auth users never choose their own role. An invitation Edge Function activates the
-- profile and assigns its approved role after the Auth user has been created.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'Staff',
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else profiles.full_name
    end;

  return new;
end;
$function$;

-- Client sessions may update only display name and avatar path. Security-sensitive
-- profile fields remain writable by the service role used by the protected Edge Functions.
create or replace function public.prevent_client_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_role <> 'service_role'
     and (
       new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.hpc_representative_name is distinct from old.hpc_representative_name
     ) then
    raise exception 'Profile security fields must use the protected Care Team service.';
  end if;

  return new;
end;
$function$;

revoke update on table public.profiles from authenticated;
grant update (full_name, avatar_path) on table public.profiles to authenticated;

-- AAL1 is sufficient only for a user to load their own active profile during mandatory
-- MFA enrollment. The rest of the active Care Team roster requires AAL2.
drop policy if exists "hpc profiles select active members" on public.profiles;
drop policy if exists "hpc profiles select own during mfa setup" on public.profiles;
create policy "hpc profiles select own during mfa setup"
  on public.profiles for select to authenticated
  using (id = auth.uid() and is_active = true);

drop policy if exists "hpc profiles select active roster with mfa" on public.profiles;
create policy "hpc profiles select active roster with mfa"
  on public.profiles for select to authenticated
  using (
    is_active = true
    and public.is_hpc_profile_member()
    and public.hpc_has_required_aal()
  );

-- Audit actor identity is derived from the validated session. Client-reported entries are
-- explicitly marked so they cannot be confused with server-authored administrative events.
create or replace function public.log_audit_event(
  p_module text,
  p_action text,
  p_target_type text default null::text,
  p_target_id text default null::text,
  p_target_label text default null::text,
  p_details jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_row public.audit_logs;
  v_details jsonb;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if v_profile.id is null then
    raise exception 'Only active care team members can write audit events';
  end if;

  if nullif(trim(coalesce(p_module, '')), '') is null
     or nullif(trim(coalesce(p_action, '')), '') is null then
    raise exception 'Audit module and action are required';
  end if;

  v_details := jsonb_set(
    coalesce(p_details, '{}'::jsonb),
    '{source}',
    '"client_reported"'::jsonb,
    true
  );

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    actor_name,
    module,
    action,
    target_type,
    target_id,
    target_label,
    details
  ) values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', v_profile.email),
    coalesce(v_profile.full_name, auth.jwt() ->> 'email'),
    left(trim(p_module), 100),
    left(trim(p_action), 160),
    nullif(left(trim(coalesce(p_target_type, '')), 100), ''),
    nullif(left(trim(coalesce(p_target_id, '')), 200), ''),
    nullif(left(trim(coalesce(p_target_label, '')), 300), ''),
    v_details
  )
  returning * into v_row;

  return v_row;
end;
$function$;

drop policy if exists "hpc audit logs insert active members" on public.audit_logs;
revoke insert, update, delete on table public.audit_logs from authenticated;
grant execute on function public.log_audit_event(text, text, text, text, text, jsonb) to authenticated;

-- Staff can maintain operational settings, while System Log remains Admin-only.
drop policy if exists "hpc client categories delete admins" on public.client_categories;
create policy "hpc client categories delete operations"
  on public.client_categories for delete to authenticated
  using (public.hpc_current_profile_has_role(array['admin', 'staff']));

drop policy if exists "hpc client categories insert admins" on public.client_categories;
create policy "hpc client categories insert operations"
  on public.client_categories for insert to authenticated
  with check (public.hpc_current_profile_has_role(array['admin', 'staff']));

drop policy if exists "hpc client categories update admins" on public.client_categories;
create policy "hpc client categories update operations"
  on public.client_categories for update to authenticated
  using (public.hpc_current_profile_has_role(array['admin', 'staff']))
  with check (public.hpc_current_profile_has_role(array['admin', 'staff']));

drop policy if exists "hpc analytics presentation exports select admins" on public.analytics_presentation_exports;
create policy "hpc analytics presentation exports select operations"
  on public.analytics_presentation_exports for select to authenticated
  using (public.hpc_current_profile_has_role(array['admin', 'staff']));

-- Require MFA for all clinical, operational, audit, and export records. Profiles remain
-- available at AAL1 only so a newly invited user can be identified and guided into MFA setup.
do $do$
declare
  table_name text;
begin
  foreach table_name in array array[
    'analytics_presentation_exports',
    'audit_logs',
    'client_4ps',
    'client_assessments',
    'client_categories',
    'client_children',
    'client_cssrs',
    'client_documents',
    'clients',
    'dashboard_announcements',
    'mobile_upload_sessions',
    'progress_notes'
  ] loop
    execute format(
      'drop policy if exists "hpc require mfa" on public.%I',
      table_name
    );
    execute format(
      'create policy "hpc require mfa" on public.%I as restrictive for all to authenticated using (public.hpc_has_required_aal()) with check (public.hpc_has_required_aal())',
      table_name
    );
  end loop;
end;
$do$;

drop policy if exists "hpc protected storage requires mfa" on storage.objects;
create policy "hpc protected storage requires mfa"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id not in ('client-documents', 'client-assessments', 'profile-pictures')
    or public.hpc_has_required_aal()
  )
  with check (
    bucket_id not in ('client-documents', 'client-assessments', 'profile-pictures')
    or public.hpc_has_required_aal()
  );

-- These legacy administrative RPCs do not require a fresh session and are not used by the
-- application. Care Team administration now goes only through protected Edge Functions.
revoke execute on function public.admin_update_profile_role(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_deactivate_profile(uuid) from public, anon, authenticated;
revoke execute on function public.cleanup_audit_logs(integer) from public, anon, authenticated;

-- New objects must not silently inherit the old blanket authenticated grants.
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke execute on functions from authenticated;
