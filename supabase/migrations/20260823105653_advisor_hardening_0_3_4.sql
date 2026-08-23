-- HPC Client Management 0.3.4 database hardening.
--
-- This migration is additive/backward-compatible with desktop 0.2.2. It keeps
-- the existing public helper function signatures in place, but removes their
-- direct API execution grants and routes RLS through a non-exposed schema.

create schema if not exists hpc_private;
revoke all on schema hpc_private from public, anon;
grant usage on schema hpc_private to authenticated, service_role;

alter default privileges in schema hpc_private
  revoke execute on functions from public, anon;

-- Privileged RLS helpers live outside the exposed Data API schema. Each helper
-- derives the caller from auth.uid(); none accepts a caller-controlled user id.
create or replace function hpc_private.hpc_current_profile_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select public.hpc_normalized_role(p.role)
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active = true
  limit 1;
$function$;

create or replace function hpc_private.hpc_current_profile_representative()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select nullif(btrim(coalesce(p.hpc_representative_name, '')), '')
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active = true
  limit 1;
$function$;

create or replace function hpc_private.hpc_current_profile_has_role(
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select coalesce(
    hpc_private.hpc_current_profile_role() = any(allowed_roles),
    false
  );
$function$;

create or replace function hpc_private.is_hpc_profile_member()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  );
$function$;

create or replace function hpc_private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
    'admin',
    'psychologist / counselor',
    'staff'
  ]);
$function$;

create or replace function hpc_private.is_admin_profile()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array['admin']);
$function$;

create or replace function hpc_private.hpc_profile_can_view_all_clients()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']);
$function$;

create or replace function hpc_private.can_access_client_by_representative(
  client_hpc_representative text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select
    hpc_private.hpc_profile_can_view_all_clients()
    or (
      hpc_private.hpc_current_profile_has_role(
        array['psychologist / counselor']
      )
      and hpc_private.hpc_current_profile_representative() is not null
      and lower(btrim(coalesce(client_hpc_representative, ''))) = lower(
        btrim(coalesce(
          hpc_private.hpc_current_profile_representative(),
          ''
        ))
      )
    );
$function$;

create or replace function hpc_private.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and hpc_private.can_access_client_by_representative(c.hpc_representative)
  );
$function$;

create or replace function hpc_private.can_manage_dashboard_announcements()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
    'admin',
    'psychologist / counselor',
    'staff'
  ]);
$function$;

create or replace function hpc_private.hpc_profile_can_view_all_representative_analytics()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']);
$function$;

create or replace function hpc_private.hpc_profile_can_write_client_clinical_records(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and hpc_private.can_access_client(target_client_id);
$function$;

create or replace function hpc_private.hpc_profile_can_write_client_cssrs_interview(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_profile_can_write_client_clinical_records(
    target_client_id
  );
$function$;

create or replace function hpc_private.hpc_profile_can_write_client_cssrs_protective_factors(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_profile_can_write_client_clinical_records(
    target_client_id
  );
$function$;

create or replace function hpc_private.hpc_profile_can_manage_client_documents(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and hpc_private.can_access_client(target_client_id);
$function$;

create or replace function hpc_private.hpc_profile_can_manage_client_assessments(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and hpc_private.can_access_client(target_client_id);
$function$;

create or replace function hpc_private.hpc_profile_can_manage_mobile_upload_session(
  target_client_id uuid,
  target_upload_type text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select case lower(btrim(coalesce(target_upload_type, '')))
    when 'document' then
      hpc_private.hpc_profile_can_manage_client_documents(target_client_id)
    when 'assessment' then
      hpc_private.hpc_profile_can_manage_client_assessments(target_client_id)
    else false
  end;
$function$;

create or replace function hpc_private.hpc_is_assignable_representative(
  representative_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.is_active = true
      and public.hpc_normalized_role(p.role) in (
        'admin',
        'psychologist / counselor'
      )
      and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
      and lower(btrim(p.hpc_representative_name)) =
          lower(btrim(coalesce(representative_name, '')))
  );
$function$;

create or replace function hpc_private.hpc_profile_can_create_client(
  representative_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select
    hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and hpc_private.hpc_is_assignable_representative(representative_name)
    and (
      hpc_private.hpc_current_profile_has_role(array['admin', 'staff'])
      or hpc_private.can_access_client_by_representative(representative_name)
    );
$function$;

create or replace function hpc_private.hpc_profile_can_delete_client(
  representative_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select
    hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and hpc_private.can_access_client_by_representative(representative_name);
$function$;

create or replace function hpc_private.hpc_profile_can_delete_client_documents(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and hpc_private.can_access_client(target_client_id);
$function$;

create or replace function hpc_private.hpc_profile_can_delete_client_assessments(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select hpc_private.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and hpc_private.can_access_client(target_client_id);
$function$;

revoke execute on all functions in schema hpc_private from public, anon;
grant execute on all functions in schema hpc_private to authenticated;

-- Route every existing RLS policy through the non-exposed helper schema while
-- preserving its current command, role list, and permissive/restrictive mode.
do $do$
declare
  policy_row record;
  helper_name text;
  rewritten_using text;
  rewritten_check text;
  alteration text;
begin
  for policy_row in
    select
      policy.oid,
      namespace.nspname as schema_name,
      relation.relname as table_name,
      policy.polname as policy_name,
      pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) as check_expression
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'storage')
  loop
    rewritten_using := policy_row.using_expression;
    rewritten_check := policy_row.check_expression;

    foreach helper_name in array array[
      'hpc_current_profile_has_role',
      'hpc_current_profile_representative',
      'hpc_current_profile_role',
      'is_hpc_profile_member',
      'is_active_staff',
      'is_admin_profile',
      'hpc_profile_can_view_all_clients',
      'can_access_client_by_representative',
      'can_access_client',
      'can_manage_dashboard_announcements',
      'hpc_profile_can_view_all_representative_analytics',
      'hpc_profile_can_write_client_clinical_records',
      'hpc_profile_can_write_client_cssrs_interview',
      'hpc_profile_can_write_client_cssrs_protective_factors',
      'hpc_profile_can_manage_client_documents',
      'hpc_profile_can_manage_client_assessments',
      'hpc_profile_can_manage_mobile_upload_session',
      'hpc_is_assignable_representative',
      'hpc_profile_can_create_client',
      'hpc_profile_can_delete_client',
      'hpc_profile_can_delete_client_documents',
      'hpc_profile_can_delete_client_assessments'
    ] loop
      if rewritten_using is not null then
        rewritten_using := regexp_replace(
          rewritten_using,
          '\m' || helper_name || '\s*\(',
          'hpc_private.' || helper_name || '(',
          'g'
        );
        rewritten_using := replace(
          rewritten_using,
          'public.hpc_private.',
          'hpc_private.'
        );
        rewritten_using := replace(
          rewritten_using,
          'hpc_private.hpc_private.',
          'hpc_private.'
        );
      end if;

      if rewritten_check is not null then
        rewritten_check := regexp_replace(
          rewritten_check,
          '\m' || helper_name || '\s*\(',
          'hpc_private.' || helper_name || '(',
          'g'
        );
        rewritten_check := replace(
          rewritten_check,
          'public.hpc_private.',
          'hpc_private.'
        );
        rewritten_check := replace(
          rewritten_check,
          'hpc_private.hpc_private.',
          'hpc_private.'
        );
      end if;
    end loop;

    if rewritten_using is distinct from policy_row.using_expression
       or rewritten_check is distinct from policy_row.check_expression then
      alteration := format(
        'alter policy %I on %I.%I',
        policy_row.policy_name,
        policy_row.schema_name,
        policy_row.table_name
      );

      if rewritten_using is not null then
        alteration := alteration || ' using (' || rewritten_using || ')';
      end if;
      if rewritten_check is not null then
        alteration := alteration || ' with check (' || rewritten_check || ')';
      end if;

      execute alteration;
    end if;
  end loop;
end;
$do$;

-- Consolidate overlapping permissive SELECT policies. The combined predicates
-- retain the previous OR semantics without executing multiple policies.
drop policy if exists "hpc client 4ps analytics raw select bridge"
  on public.client_4ps;
drop policy if exists "hpc client 4ps select accessible"
  on public.client_4ps;
create policy "hpc client 4ps select accessible"
  on public.client_4ps for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

drop policy if exists "hpc client assessments analytics raw select bridge"
  on public.client_assessments;
drop policy if exists "hpc client assessments select accessible"
  on public.client_assessments;
create policy "hpc client assessments select accessible"
  on public.client_assessments for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

drop policy if exists "Active HPC staff can read client categories"
  on public.client_categories;
drop policy if exists "hpc client categories select members"
  on public.client_categories;
create policy "hpc client categories select members"
  on public.client_categories for select to authenticated
  using ((select hpc_private.is_hpc_profile_member()));

drop policy if exists "hpc client children analytics raw select bridge"
  on public.client_children;
drop policy if exists "hpc client children select accessible"
  on public.client_children;
create policy "hpc client children select accessible"
  on public.client_children for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

drop policy if exists "hpc client cssrs analytics raw select bridge"
  on public.client_cssrs;
drop policy if exists "hpc client cssrs select accessible"
  on public.client_cssrs;
create policy "hpc client cssrs select accessible"
  on public.client_cssrs for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

drop policy if exists "hpc client documents analytics raw select bridge"
  on public.client_documents;
drop policy if exists "hpc client documents select accessible"
  on public.client_documents;
create policy "hpc client documents select accessible"
  on public.client_documents for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

drop policy if exists "hpc clients analytics raw select bridge" on public.clients;
drop policy if exists "hpc clients select accessible" on public.clients;
create policy "hpc clients select accessible"
  on public.clients for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client_by_representative(hpc_representative)
  );

drop policy if exists "hpc mobile upload sessions analytics raw select bridge"
  on public.mobile_upload_sessions;
drop policy if exists "hpc mobile upload sessions select own accessible"
  on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions select accessible"
  on public.mobile_upload_sessions for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or (
      created_by = (select auth.uid())
      and hpc_private.can_access_client(client_id)
    )
  );

drop policy if exists "hpc profiles select active roster with mfa"
  on public.profiles;
drop policy if exists "hpc profiles select own during mfa setup"
  on public.profiles;
create policy "hpc profiles select permitted"
  on public.profiles for select to authenticated
  using (
    (
      id = (select auth.uid())
      and (is_active = true or (select public.hpc_has_required_aal()))
    )
    or (
      is_active = true
      and (select hpc_private.is_hpc_profile_member())
      and (select public.hpc_has_required_aal())
    )
  );

drop policy if exists "hpc progress notes analytics raw select bridge"
  on public.progress_notes;
drop policy if exists "hpc progress notes select accessible"
  on public.progress_notes;
create policy "hpc progress notes select accessible"
  on public.progress_notes for select to authenticated
  using (
    (select hpc_private.hpc_profile_can_view_all_representative_analytics())
    or hpc_private.can_access_client(client_id)
  );

-- Avoid per-row re-evaluation of auth helpers in the remaining write policies.
drop policy if exists "hpc profiles update own display fields" on public.profiles;
create policy "hpc profiles update own display fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_active = true)
  with check (id = (select auth.uid()) and is_active = true);

drop policy if exists "hpc client cssrs insert interview" on public.client_cssrs;
create policy "hpc client cssrs insert interview"
  on public.client_cssrs for insert to authenticated
  with check (
    hpc_private.hpc_profile_can_write_client_cssrs_interview(client_id)
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists "hpc client cssrs update interview" on public.client_cssrs;
create policy "hpc client cssrs update interview"
  on public.client_cssrs for update to authenticated
  using (hpc_private.hpc_profile_can_write_client_cssrs_interview(client_id))
  with check (
    hpc_private.hpc_profile_can_write_client_cssrs_interview(client_id)
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists "hpc mobile upload sessions insert own permitted target"
  on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions insert own permitted target"
  on public.mobile_upload_sessions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and hpc_private.hpc_profile_can_manage_mobile_upload_session(
      client_id,
      target_type
    )
  );

drop policy if exists "hpc mobile upload sessions update own permitted target"
  on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions update own permitted target"
  on public.mobile_upload_sessions for update to authenticated
  using (
    created_by = (select auth.uid())
    and hpc_private.hpc_profile_can_manage_mobile_upload_session(
      client_id,
      target_type
    )
  )
  with check (
    created_by = (select auth.uid())
    and hpc_private.hpc_profile_can_manage_mobile_upload_session(
      client_id,
      target_type
    )
  );

drop policy if exists "hpc clients insert accessible" on public.clients;
create policy "hpc clients insert accessible"
  on public.clients for insert to authenticated
  with check (
    hpc_private.hpc_profile_can_create_client(hpc_representative)
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists "hpc client documents insert permitted"
  on public.client_documents;
create policy "hpc client documents insert permitted"
  on public.client_documents for insert to authenticated
  with check (
    hpc_private.hpc_profile_can_manage_client_documents(client_id)
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists "hpc client assessments insert permitted"
  on public.client_assessments;
create policy "hpc client assessments insert permitted"
  on public.client_assessments for insert to authenticated
  with check (
    hpc_private.hpc_profile_can_manage_client_assessments(client_id)
    and (created_by is null or created_by = (select auth.uid()))
  );

drop policy if exists "hpc admin staff insert clinic settings"
  on public.clinic_settings;
create policy "hpc admin staff insert clinic settings"
  on public.clinic_settings for insert to authenticated
  with check (
    id = 1
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );

drop policy if exists "hpc admin staff update clinic settings"
  on public.clinic_settings;
create policy "hpc admin staff update clinic settings"
  on public.clinic_settings for update to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  )
  with check (
    id = 1
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );

-- The public intake RPC and appointment trigger are SECURITY INVOKER. Route
-- their privileged profile lookups through the private helper schema.
create or replace function public.hpc_enforce_appointment_write_rules()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  actor_role text;
  intake_link_authorized boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     or current_role = 'service_role' then
    return new;
  end if;

  if not public.hpc_has_required_aal() then
    raise exception 'Appointment changes require a verified MFA session.';
  end if;

  actor_role := hpc_private.hpc_current_profile_role();
  if actor_role is null then
    raise exception 'Only active care team accounts can change appointments.';
  end if;

  if tg_op = 'INSERT' then
    if actor_role not in ('admin', 'staff') then
      raise exception 'Only Admin and Staff accounts can create appointments.';
    end if;

    new.removed_at := null;
    new.removed_by := null;
    new.removal_reason := null;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    return new;
  end if;

  if old.removed_at is not null then
    raise exception 'Removed appointments cannot be changed from the calendar.';
  end if;

  if not public.hpc_appointment_transition_allowed(old.status, new.status) then
    raise exception 'Appointment status transition from % to % is not allowed.',
      old.status,
      new.status;
  end if;

  if new.client_stage_at_booking is distinct from old.client_stage_at_booking then
    raise exception 'The client stage recorded at booking is immutable.';
  end if;

  if new.client_id is distinct from old.client_id then
    if old.client_stage_at_booking = 'new' then
      intake_link_authorized :=
        coalesce(current_setting('hpc.intake_link_authorized', true), '') = 'true';

      if not intake_link_authorized
         or old.client_id is not null
         or new.client_id is null
         or old.status <> 'arrived'
         or new.status <> 'intake_in_progress' then
        raise exception 'First-timer client links must be created through Begin Intake.';
      end if;
    elsif old.status not in ('scheduled', 'confirmed') or new.client_id is null then
      raise exception 'An existing client can only be corrected before arrival.';
    end if;
  end if;

  if actor_role = 'psychologist / counselor' then
    if old.provider_profile_id <> auth.uid() then
      raise exception 'Psychologists and counselors can update only their own appointments.';
    end if;

    if new.status not in ('in_session', 'completed') then
      raise exception 'Psychologists and counselors can only mark sessions In Session or Completed.';
    end if;

    if new.client_id is distinct from old.client_id
       or new.provisional_client_name is distinct from old.provisional_client_name
       or new.provisional_contact_number is distinct from old.provisional_contact_number
       or new.booking_source is distinct from old.booking_source
       or new.provider_profile_id is distinct from old.provider_profile_id
       or new.service_id is distinct from old.service_id
       or new.appointment_mode is distinct from old.appointment_mode
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.scheduling_note is distinct from old.scheduling_note
       or new.cancellation_reason is distinct from old.cancellation_reason
       or new.intake_linked_at is distinct from old.intake_linked_at
       or new.removed_at is distinct from old.removed_at
       or new.removed_by is distinct from old.removed_by
       or new.removal_reason is distinct from old.removal_reason
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Psychologists and counselors cannot change appointment details.';
    end if;
  elsif actor_role not in ('admin', 'staff') then
    raise exception 'Your role cannot change appointments.';
  end if;

  if new.removed_at is distinct from old.removed_at
     or new.removed_by is distinct from old.removed_by
     or new.removal_reason is distinct from old.removal_reason then
    if actor_role not in ('admin', 'staff') then
      raise exception 'Only Admin and Staff accounts can remove appointments.';
    end if;
    if new.removed_at is null then
      raise exception 'Removed appointments can only be restored through an approved recovery process.';
    end if;
    if old.intake_linked_at is not null
       or old.status in ('intake_in_progress', 'in_session', 'completed') then
      raise exception 'Appointments linked to care cannot be removed from the calendar.';
    end if;
    if length(btrim(coalesce(new.removal_reason, ''))) not between 2 and 240 then
      raise exception 'Enter a reason for removing the appointment.';
    end if;

    new.removed_at := now();
    new.removed_by := auth.uid();
    new.removal_reason := btrim(new.removal_reason);
  end if;

  new.updated_by := auth.uid();
  return new;
end;
$function$;

create or replace function public.hpc_begin_appointment_intake(
  target_appointment_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  appointment_row public.appointments%rowtype;
  representative_name text;
  new_client_id uuid;
begin
  if not public.hpc_has_required_aal()
     or not hpc_private.hpc_current_profile_has_role(array['admin', 'staff']) then
    raise exception 'Only MFA-verified Admin and Staff accounts can begin intake.';
  end if;

  select * into appointment_row
  from public.appointments
  where id = target_appointment_id
  for update;

  if appointment_row.id is null then
    raise exception 'The appointment was not found.';
  end if;

  if appointment_row.client_stage_at_booking <> 'new'
     or appointment_row.client_id is not null then
    raise exception 'This appointment is already linked to a client record.';
  end if;

  if appointment_row.status <> 'arrived' then
    raise exception 'Mark the first-timer Arrived before beginning intake.';
  end if;

  select nullif(btrim(coalesce(p.hpc_representative_name, '')), '')
  into representative_name
  from public.profiles p
  where p.id = appointment_row.provider_profile_id
    and p.is_active = true;

  if representative_name is null then
    raise exception 'The assigned psychologist or counselor has no HPC Representative name.';
  end if;

  insert into public.clients (
    client_name,
    mobile_number,
    intake_date,
    hpc_representative,
    client_status,
    created_by
  ) values (
    btrim(appointment_row.provisional_client_name),
    nullif(btrim(coalesce(appointment_row.provisional_contact_number, '')), ''),
    (now() at time zone 'Asia/Manila')::date,
    representative_name,
    'Active',
    auth.uid()
  )
  returning id into new_client_id;

  perform set_config('hpc.intake_link_authorized', 'true', true);

  update public.appointments
  set client_id = new_client_id,
      intake_linked_at = now(),
      status = 'intake_in_progress',
      updated_by = auth.uid()
  where id = target_appointment_id;

  perform public.log_audit_event(
    'Clients',
    'Created from appointment intake',
    'client',
    new_client_id::text,
    btrim(appointment_row.provisional_client_name),
    jsonb_build_object(
      'appointment_id', target_appointment_id,
      'summary', 'Created a client record when intake began.'
    )
  );

  return new_client_id;
end;
$function$;

-- Client-authored audit events use an invoker RPC. A non-callable BEFORE trigger
-- stamps immutable identity and time fields, so a direct table insert has the
-- same integrity controls as the RPC.
create or replace function public.hpc_stamp_client_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  actor_profile public.profiles%rowtype;
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and pg_trigger_depth() = 1 then
    select * into actor_profile
    from public.profiles
    where id = (select auth.uid())
      and is_active = true;

    if actor_profile.id is null then
      raise exception 'Only active care team members can write audit events.';
    end if;
    if nullif(btrim(coalesce(new.module, '')), '') is null
       or nullif(btrim(coalesce(new.action, '')), '') is null then
      raise exception 'Audit module and action are required.';
    end if;
    if jsonb_typeof(coalesce(new.details, '{}'::jsonb)) <> 'object' then
      raise exception 'Audit event details must be a JSON object.';
    end if;

    new.id := gen_random_uuid();
    new.created_at := now();
    new.actor_user_id := auth.uid();
    new.actor_email := coalesce(auth.jwt() ->> 'email', actor_profile.email);
    new.actor_name := coalesce(
      nullif(btrim(actor_profile.full_name), ''),
      auth.jwt() ->> 'email'
    );
    new.module := left(btrim(new.module), 100);
    new.action := left(btrim(new.action), 160);
    new.target_type := nullif(left(btrim(coalesce(new.target_type, '')), 100), '');
    new.target_id := nullif(left(btrim(coalesce(new.target_id, '')), 200), '');
    new.target_label := nullif(left(btrim(coalesce(new.target_label, '')), 300), '');
    new.details := jsonb_set(
      coalesce(new.details, '{}'::jsonb),
      '{source}',
      '"client_reported"'::jsonb,
      true
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists hpc_stamp_client_audit_event on public.audit_logs;
create trigger hpc_stamp_client_audit_event
before insert on public.audit_logs
for each row
execute function public.hpc_stamp_client_audit_event();

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
security invoker
set search_path = pg_catalog, public
as $function$
declare
  audit_row public.audit_logs;
begin
  insert into public.audit_logs (
    module,
    action,
    target_type,
    target_id,
    target_label,
    details
  ) values (
    p_module,
    p_action,
    p_target_type,
    p_target_id,
    p_target_label,
    coalesce(p_details, '{}'::jsonb)
  )
  returning * into audit_row;

  return audit_row;
end;
$function$;

drop policy if exists "hpc audit logs insert active members" on public.audit_logs;
create policy "hpc audit logs insert active members"
  on public.audit_logs for insert to authenticated
  with check (
    (select hpc_private.is_hpc_profile_member())
    and actor_user_id = (select auth.uid())
    and details ->> 'source' = 'client_reported'
  );

grant insert on public.audit_logs to authenticated;
revoke update, delete on public.audit_logs from authenticated;

-- Fix every currently mutable trigger-function search path.
alter function public.touch_profile_avatar_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_client_cssrs_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_dashboard_announcements_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_profiles_updated_at()
  set search_path = pg_catalog, public;
alter function public.touch_client_categories_updated_at()
  set search_path = pg_catalog, public;

-- Remove inherited API execution from all public functions, then regrant only
-- the SECURITY INVOKER functions required by RLS, triggers, and the desktop RPCs.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.hpc_has_required_aal() to authenticated;
grant execute on function public.hpc_storage_client_id_from_path(text)
  to authenticated;
grant execute on function public.hpc_appointment_transition_allowed(text, text)
  to authenticated;
grant execute on function public.hpc_begin_appointment_intake(uuid)
  to authenticated;
grant execute on function public.log_audit_event(
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- Cover every foreign-key column currently reported by the Performance Advisor.
create index if not exists client_4ps_narrative_generated_by_idx
  on public.client_4ps (narrative_generated_by);
create index if not exists client_4ps_updated_by_idx
  on public.client_4ps (updated_by);
create index if not exists client_assessments_created_by_idx
  on public.client_assessments (created_by);
create index if not exists client_cssrs_created_by_idx
  on public.client_cssrs (created_by);
create index if not exists client_documents_created_by_idx
  on public.client_documents (created_by);
create index if not exists clients_created_by_idx
  on public.clients (created_by);
create index if not exists clinic_settings_updated_by_idx
  on public.clinic_settings (updated_by);
create index if not exists dashboard_announcements_created_by_idx
  on public.dashboard_announcements (created_by);
create index if not exists mobile_upload_sessions_created_by_idx
  on public.mobile_upload_sessions (created_by);
create index if not exists progress_notes_created_by_idx
  on public.progress_notes (created_by);
