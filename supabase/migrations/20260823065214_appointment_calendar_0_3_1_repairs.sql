-- HPC Client Management 0.3.1 calendar repairs (staging-applied migration).
-- Apply to staging first. This keeps appointment removal recoverable, recognizes
-- every active HPC Representative as a clinician, and prevents conflicting
-- dated availability blocks.

alter table public.appointments
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles(id) on delete restrict,
  add column removal_reason text,
  add constraint appointments_removal_state_check check (
    (
      removed_at is null
      and removed_by is null
      and removal_reason is null
    )
    or
    (
      removed_at is not null
      and removed_by is not null
      and length(btrim(coalesce(removal_reason, ''))) between 2 and 240
    )
  );

alter table public.appointments
  drop constraint appointments_no_provider_overlap;

alter table public.appointments
  add constraint appointments_no_provider_overlap
  exclude using gist (
    provider_profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    removed_at is null
    and status not in ('cancelled', 'no_show')
  );

alter table public.care_team_availability_overrides
  add constraint care_team_availability_overrides_no_overlap
  exclude using gist (
    profile_id with =,
    tsrange(
      availability_date + starts_at,
      availability_date + ends_at,
      '[)'
    ) with &&
  );

create index appointments_visible_starts_at_idx
  on public.appointments (starts_at)
  where removed_at is null;
create index appointments_removed_at_idx
  on public.appointments (removed_at desc)
  where removed_at is not null;
create index appointments_removed_by_idx
  on public.appointments (removed_by)
  where removed_by is not null;

-- Index every calendar foreign-key column used by joins, audits, and backup restore.
create index appointment_services_created_by_idx
  on public.appointment_services (created_by)
  where created_by is not null;
create index appointment_services_updated_by_idx
  on public.appointment_services (updated_by)
  where updated_by is not null;
create index clinic_hours_updated_by_idx
  on public.clinic_hours (updated_by)
  where updated_by is not null;
create index care_team_availability_updated_by_idx
  on public.care_team_availability (updated_by)
  where updated_by is not null;
create index care_team_availability_overrides_updated_by_idx
  on public.care_team_availability_overrides (updated_by)
  where updated_by is not null;
create index appointments_service_id_idx
  on public.appointments (service_id);
create index appointments_created_by_idx
  on public.appointments (created_by);
create index appointments_updated_by_idx
  on public.appointments (updated_by);

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

  actor_role := public.hpc_current_profile_role();
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
    raise exception 'Appointment status transition from % to % is not allowed.', old.status, new.status;
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

create or replace function public.hpc_validate_appointment_schedule()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  local_start timestamp without time zone;
  local_end timestamp without time zone;
  local_date date;
  local_weekday smallint;
  local_start_time time without time zone;
  local_end_time time without time zone;
  provider_representative text;
  client_representative text;
  client_status_value text;
  service_duration integer;
  has_recurring_availability boolean;
  has_available_override boolean;
  has_unavailable_override boolean;
begin
  if new.removed_at is not null
     or new.status in ('cancelled', 'no_show') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.provider_profile_id is not distinct from old.provider_profile_id
     and new.service_id is not distinct from old.service_id
     and new.client_id is not distinct from old.client_id
     and new.starts_at is not distinct from old.starts_at
     and new.ends_at is not distinct from old.ends_at then
    return new;
  end if;

  select nullif(btrim(coalesce(p.hpc_representative_name, '')), '')
  into provider_representative
  from public.profiles p
  where p.id = new.provider_profile_id
    and p.is_active = true;

  if provider_representative is null then
    raise exception 'Choose an active clinician with an HPC Representative assignment.';
  end if;

  select s.default_duration_minutes
  into service_duration
  from public.appointment_services s
  where s.id = new.service_id
    and s.is_active = true;

  if service_duration is null then
    raise exception 'Choose an active appointment service.';
  end if;

  if new.ends_at <> new.starts_at + make_interval(mins => service_duration) then
    raise exception 'The appointment length must match the selected service duration.';
  end if;

  if new.client_id is not null then
    select c.client_status, nullif(btrim(coalesce(c.hpc_representative, '')), '')
    into client_status_value, client_representative
    from public.clients c
    where c.id = new.client_id;

    if client_status_value is null then
      raise exception 'The selected client record was not found.';
    end if;

    if client_status_value <> 'Active' then
      raise exception 'Appointments can only be booked for active clients.';
    end if;

    if new.client_stage_at_booking = 'existing'
       and lower(coalesce(client_representative, ''))
         <> lower(provider_representative) then
      raise exception 'Existing clients must be booked with their assigned HPC Representative.';
    end if;
  end if;

  local_start := new.starts_at at time zone 'Asia/Manila';
  local_end := new.ends_at at time zone 'Asia/Manila';
  local_date := local_start::date;
  local_weekday := extract(dow from local_start)::smallint;
  local_start_time := local_start::time;
  local_end_time := local_end::time;

  if local_end::date <> local_date then
    raise exception 'Appointments must begin and end on the same Philippine calendar day.';
  end if;

  if not exists (
    select 1
    from public.clinic_hours h
    where h.weekday = local_weekday
      and h.is_open = true
      and h.opens_at <= local_start_time
      and h.closes_at >= local_end_time
  ) then
    raise exception 'The appointment is outside the configured clinic hours.';
  end if;

  select exists (
    select 1
    from public.care_team_availability a
    where a.profile_id = new.provider_profile_id
      and a.weekday = local_weekday
      and a.is_active = true
      and a.starts_at <= local_start_time
      and a.ends_at >= local_end_time
  ) into has_recurring_availability;

  select exists (
    select 1
    from public.care_team_availability_overrides o
    where o.profile_id = new.provider_profile_id
      and o.availability_date = local_date
      and o.availability_kind = 'available'
      and o.starts_at <= local_start_time
      and o.ends_at >= local_end_time
  ) into has_available_override;

  select exists (
    select 1
    from public.care_team_availability_overrides o
    where o.profile_id = new.provider_profile_id
      and o.availability_date = local_date
      and o.availability_kind = 'unavailable'
      and o.starts_at < local_end_time
      and o.ends_at > local_start_time
  ) into has_unavailable_override;

  if has_unavailable_override or not (has_recurring_availability or has_available_override) then
    raise exception 'The clinician is not available for this time.';
  end if;

  return new;
end;
$function$;

-- Use row JSON so the shared trigger never references columns absent from a table.
create or replace function public.hpc_audit_calendar_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_profile public.profiles%rowtype;
  row_before jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  row_after jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  target_row_id text;
  action_name text;
  detail_payload jsonb;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select * into actor_profile
  from public.profiles
  where id = auth.uid() and is_active = true;

  if actor_profile.id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'clinic_hours' then
    target_row_id := coalesce(row_after ->> 'weekday', row_before ->> 'weekday');
  else
    target_row_id := coalesce(row_after ->> 'id', row_before ->> 'id');
  end if;

  if tg_op = 'DELETE' then
    action_name := 'Deleted';
  elsif tg_op = 'INSERT' then
    action_name := 'Created';
  elsif tg_table_name = 'appointments'
        and row_after ->> 'removed_at' is distinct from row_before ->> 'removed_at'
        and nullif(row_after ->> 'removed_at', '') is not null then
    action_name := 'Removed from calendar';
  elsif tg_table_name = 'appointments'
        and row_after ->> 'status' is distinct from row_before ->> 'status' then
    action_name := 'Status changed to ' || coalesce(row_after ->> 'status', 'unknown');
  else
    action_name := 'Updated';
  end if;

  detail_payload := jsonb_build_object(
    'source', 'database_trigger',
    'table', tg_table_name
  );

  if tg_table_name = 'appointments' then
    detail_payload := detail_payload || jsonb_build_object(
      'provider_profile_id', coalesce(
        row_after ->> 'provider_profile_id',
        row_before ->> 'provider_profile_id'
      ),
      'starts_at', coalesce(row_after ->> 'starts_at', row_before ->> 'starts_at'),
      'status', coalesce(row_after ->> 'status', row_before ->> 'status'),
      'client_stage_at_booking', coalesce(
        row_after ->> 'client_stage_at_booking',
        row_before ->> 'client_stage_at_booking'
      ),
      'removed_at', nullif(row_after ->> 'removed_at', ''),
      'removal_reason', nullif(row_after ->> 'removal_reason', '')
    );
  end if;

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
    coalesce(auth.jwt() ->> 'email', actor_profile.email),
    coalesce(actor_profile.full_name, actor_profile.email),
    'Calendar',
    left(action_name, 160),
    tg_table_name,
    target_row_id,
    case tg_table_name
      when 'appointments' then 'Appointment'
      when 'appointment_services' then 'Appointment service'
      when 'clinic_hours' then 'Clinic hours'
      else 'Care team availability'
    end,
    detail_payload
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

-- Availability ownership follows the HPC Representative assignment, not the
-- display role. This allows an Admin clinician such as Clinic Administrator to set hours.
drop policy if exists "availability insert own" on public.care_team_availability;
create policy "availability insert own"
  on public.care_team_availability for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "availability update own" on public.care_team_availability;
create policy "availability update own"
  on public.care_team_availability for update to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  )
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "availability delete own" on public.care_team_availability;
create policy "availability delete own"
  on public.care_team_availability for delete to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "availability overrides insert own"
  on public.care_team_availability_overrides;
create policy "availability overrides insert own"
  on public.care_team_availability_overrides for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "availability overrides update own"
  on public.care_team_availability_overrides;
create policy "availability overrides update own"
  on public.care_team_availability_overrides for update to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  )
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "availability overrides delete own"
  on public.care_team_availability_overrides;
create policy "availability overrides delete own"
  on public.care_team_availability_overrides for delete to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
    )
  );

drop policy if exists "appointments select by calendar role" on public.appointments;
create policy "appointments select by calendar role"
  on public.appointments for select to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      provider_profile_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
      )
    )
  );

drop policy if exists "appointments update by calendar role" on public.appointments;
create policy "appointments update by calendar role"
  on public.appointments for update to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      provider_profile_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
      )
    )
  )
  with check (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      provider_profile_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null
      )
    )
  );

revoke execute on function public.hpc_enforce_appointment_write_rules()
  from public, anon, authenticated;
revoke execute on function public.hpc_validate_appointment_schedule()
  from public, anon, authenticated;
revoke execute on function public.hpc_audit_calendar_change()
  from public, anon, authenticated;
