-- Deployment verification for the HPC Client Management calendar migrations.
-- Structural checks are read-only. Behavioral writes run inside a transaction
-- that is always rolled back.

do $verification$
declare
  expected_tables constant text[] := array[
    'appointment_services',
    'clinic_hours',
    'care_team_availability',
    'care_team_availability_overrides',
    'appointments'
  ];
  missing_tables text[];
  tables_without_rls text[];
  missing_functions text[];
  policy_count integer;
  service_count integer;
  clinic_day_count integer;
begin
  select array_agg(expected.table_name order by expected.table_name)
  into missing_tables
  from unnest(expected_tables) as expected(table_name)
  where to_regclass(format('public.%I', expected.table_name)) is null;

  if missing_tables is not null then
    raise exception 'Missing calendar tables: %', missing_tables;
  end if;

  select array_agg(classes.relname order by classes.relname)
  into tables_without_rls
  from pg_class as classes
  join pg_namespace as namespaces on namespaces.oid = classes.relnamespace
  where namespaces.nspname = 'public'
    and classes.relname = any(expected_tables)
    and not classes.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Calendar tables without RLS: %', tables_without_rls;
  end if;

  select array_agg(expected.function_name order by expected.function_name)
  into missing_functions
  from unnest(array[
    'hpc_appointment_transition_allowed',
    'hpc_enforce_appointment_write_rules',
    'hpc_validate_appointment_schedule',
    'hpc_stamp_calendar_actor',
    'hpc_audit_calendar_change',
    'hpc_begin_appointment_intake'
  ]) as expected(function_name)
  where not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname = expected.function_name
  );

  if missing_functions is not null then
    raise exception 'Missing calendar functions: %', missing_functions;
  end if;

  if not exists (
    select 1
    from pg_extension
    where extname = 'btree_gist'
  ) then
    raise exception 'The btree_gist extension is not installed.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'care_team_availability_overrides_no_overlap'
      and contype = 'x'
  ) then
    raise exception 'The dated availability overlap constraint is missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'removed_at'
  ) then
    raise exception 'Recoverable appointment removal is missing.';
  end if;

  if pg_get_functiondef('public.hpc_audit_calendar_change()'::regprocedure)
     like '%new.status is distinct from old.status%' then
    raise exception 'The shared calendar audit trigger still assumes every table has a status column.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_provider_overlap'
      and contype = 'x'
  ) then
    raise exception 'The provider overlap exclusion constraint is missing.';
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(expected_tables);

  if policy_count <> 21 then
    raise exception 'Expected 21 calendar RLS policies, found %.', policy_count;
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = any(expected_tables)
      and grantee in ('PUBLIC', 'anon')
  ) then
    raise exception 'A calendar table is directly granted to PUBLIC or anon.';
  end if;

  if (
    select count(distinct table_name)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = any(expected_tables)
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ) <> 5 then
    raise exception 'Authenticated SELECT grants are incomplete.';
  end if;

  select count(*) into service_count
  from public.appointment_services
  where is_active;

  if service_count < 4 then
    raise exception 'Expected at least four active appointment services, found %.', service_count;
  end if;

  select count(*) into clinic_day_count
  from public.clinic_hours;

  if clinic_day_count <> 7 then
    raise exception 'Expected seven clinic-hours rows, found %.', clinic_day_count;
  end if;

  if not public.hpc_appointment_transition_allowed('scheduled', 'confirmed')
     or public.hpc_appointment_transition_allowed('completed', 'scheduled') then
    raise exception 'Appointment transition rules do not match the reviewed workflow.';
  end if;
end;
$verification$;

begin;

-- Supply a recurring availability window for the rollback-only behavioral test.
insert into public.care_team_availability (
  profile_id,
  weekday,
  starts_at,
  ends_at,
  is_active
)
select
  profiles.id,
  extract(
    dow from (
      (current_date + 14)
      + ((8 - extract(isodow from current_date + 14)::integer) % 7)
    )
  )::smallint,
  time '09:00',
  time '12:00',
  true
from public.profiles
where profiles.is_active
  and nullif(btrim(coalesce(profiles.hpc_representative_name, '')), '') is not null
order by profiles.created_at
limit 1
on conflict (profile_id, weekday, starts_at, ends_at)
do update set is_active = true;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', profiles.id,
    'role', 'authenticated',
    'aal', 'aal2',
    'email', coalesce(profiles.email, 'verification-admin@example.invalid')
  )::text,
  true
)
from public.profiles
where public.hpc_normalized_role(profiles.role) = 'admin'
  and profiles.is_active
order by profiles.created_at
limit 1;

set local role authenticated;

do $behavior$
declare
  test_date date;
  test_provider_id uuid;
  test_service_id uuid;
  test_duration integer;
  test_start timestamptz;
  test_end timestamptz;
  test_appointment_id uuid;
  created_client_id uuid;
  overlap_rejected boolean := false;
  outside_hours_rejected boolean := false;
begin
  test_date := (current_date + 14)
    + ((8 - extract(isodow from current_date + 14)::integer) % 7);

  select profiles.id
  into test_provider_id
  from public.profiles
  where profiles.is_active
    and nullif(btrim(coalesce(profiles.hpc_representative_name, '')), '') is not null
  order by profiles.created_at
  limit 1;

  select services.id, services.default_duration_minutes
  into test_service_id, test_duration
  from public.appointment_services as services
  where services.is_active
    and services.default_duration_minutes = 60
  order by services.name
  limit 1;

  if test_provider_id is null or test_service_id is null then
    raise exception 'The verification environment needs one active clinician and one active 60-minute service.';
  end if;

  test_start := (test_date + time '09:00') at time zone 'Asia/Manila';
  test_end := test_start + make_interval(mins => test_duration);

  insert into public.appointments (
    client_stage_at_booking,
    provisional_client_name,
    provisional_contact_number,
    booking_source,
    provider_profile_id,
    service_id,
    appointment_mode,
    starts_at,
    ends_at,
    status,
    scheduling_note
  ) values (
    'new',
    'Calendar Verification First-timer',
    '09170000000',
    'phone',
    test_provider_id,
    test_service_id,
    'in_person',
    test_start,
    test_end,
    'scheduled',
    'Rollback-only deployment verification.'
  )
  returning id into test_appointment_id;

  begin
    insert into public.appointments (
      client_stage_at_booking,
      provisional_client_name,
      booking_source,
      provider_profile_id,
      service_id,
      appointment_mode,
      starts_at,
      ends_at,
      status
    ) values (
      'new',
      'Calendar Verification Overlap',
      'phone',
      test_provider_id,
      test_service_id,
      'in_person',
      test_start + interval '30 minutes',
      test_end + interval '30 minutes',
      'scheduled'
    );
  exception when exclusion_violation then
    overlap_rejected := true;
  end;

  if not overlap_rejected then
    raise exception 'The double-booking verification was not rejected.';
  end if;

  begin
    insert into public.appointments (
      client_stage_at_booking,
      provisional_client_name,
      booking_source,
      provider_profile_id,
      service_id,
      appointment_mode,
      starts_at,
      ends_at,
      status
    ) values (
      'new',
      'Calendar Verification Outside Hours',
      'walk_in',
      test_provider_id,
      test_service_id,
      'in_person',
      (test_date + time '06:00') at time zone 'Asia/Manila',
      (test_date + time '07:00') at time zone 'Asia/Manila',
      'scheduled'
    );
  exception when raise_exception then
    if position('outside the configured clinic hours' in sqlerrm) > 0 then
      outside_hours_rejected := true;
    else
      raise;
    end if;
  end;

  if not outside_hours_rejected then
    raise exception 'The outside-hours verification was not rejected.';
  end if;

  update public.appointments
  set status = 'arrived'
  where id = test_appointment_id;

  created_client_id := public.hpc_begin_appointment_intake(test_appointment_id);

  if created_client_id is null
     or not exists (
       select 1
       from public.appointments
       where id = test_appointment_id
         and client_id = created_client_id
         and client_stage_at_booking = 'new'
         and status = 'intake_in_progress'
     )
     or not exists (
       select 1
       from public.clients
       where id = created_client_id
         and client_name = 'Calendar Verification First-timer'
     ) then
    raise exception 'The transactional first-timer intake verification failed.';
  end if;

  if (
    select count(*)
    from public.appointment_status_events
    where appointment_id = test_appointment_id
      and event_source in ('appointment_created', 'status_change')
  ) <> 3 then
    raise exception 'The server-timed appointment status timeline verification failed.';
  end if;
end;
$behavior$;

rollback;

select
  'appointment_calendar_0_3_2_verified' as verification,
  (select count(*) from public.appointment_services where is_active) as active_services,
  (select count(*) from public.clinic_hours where is_open) as open_clinic_days,
  (select count(*) from pg_policies where schemaname = 'public' and tablename in (
    'appointment_services',
    'clinic_hours',
    'care_team_availability',
    'care_team_availability_overrides',
    'appointments',
    'appointment_status_events'
  )) as calendar_policy_count,
  (select count(*) from public.appointment_status_events) as status_event_count;
