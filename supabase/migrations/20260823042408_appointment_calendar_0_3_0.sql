-- HPC Client Management 0.3.0 appointment calendar.
-- Apply to staging first. This migration is additive and preserves the stable 0.2.2 data.

create extension if not exists btree_gist with schema extensions;

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_duration_minutes integer not null,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_services_name_check check (length(btrim(name)) between 2 and 120),
  constraint appointment_services_duration_check check (
    default_duration_minutes between 15 and 480
    and default_duration_minutes % 5 = 0
  )
);

create unique index appointment_services_name_lower_unique_idx
  on public.appointment_services (lower(btrim(name)));
create index appointment_services_active_name_idx
  on public.appointment_services (name)
  where is_active = true;

create table public.clinic_hours (
  weekday smallint primary key,
  is_open boolean not null default false,
  opens_at time without time zone,
  closes_at time without time zone,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint clinic_hours_weekday_check check (weekday between 0 and 6),
  constraint clinic_hours_window_check check (
    (is_open and opens_at is not null and closes_at is not null and closes_at > opens_at)
    or
    (not is_open and opens_at is null and closes_at is null)
  )
);

create table public.care_team_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  is_active boolean not null default true,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_team_availability_weekday_check check (weekday between 0 and 6),
  constraint care_team_availability_window_check check (ends_at > starts_at),
  constraint care_team_availability_exact_unique unique (
    profile_id,
    weekday,
    starts_at,
    ends_at
  )
);

create index care_team_availability_profile_weekday_idx
  on public.care_team_availability (profile_id, weekday, starts_at, ends_at)
  where is_active = true;

create table public.care_team_availability_overrides (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  availability_date date not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  availability_kind text not null,
  note text,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_team_availability_overrides_window_check check (ends_at > starts_at),
  constraint care_team_availability_overrides_kind_check check (
    availability_kind in ('available', 'unavailable')
  ),
  constraint care_team_availability_overrides_note_check check (
    note is null or length(btrim(note)) <= 240
  ),
  constraint care_team_availability_overrides_exact_unique unique (
    profile_id,
    availability_date,
    starts_at,
    ends_at,
    availability_kind
  )
);

create index care_team_availability_overrides_profile_date_idx
  on public.care_team_availability_overrides (
    profile_id,
    availability_date,
    starts_at,
    ends_at
  );

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  client_stage_at_booking text not null,
  provisional_client_name text,
  provisional_contact_number text,
  booking_source text not null,
  provider_profile_id uuid not null references public.profiles(id) on delete restrict,
  service_id uuid not null references public.appointment_services(id) on delete restrict,
  appointment_mode text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled',
  scheduling_note text,
  cancellation_reason text,
  intake_linked_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  updated_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_client_stage_check check (
    client_stage_at_booking in ('new', 'existing')
  ),
  constraint appointments_client_reference_check check (
    (
      client_stage_at_booking = 'existing'
      and client_id is not null
      and provisional_client_name is null
      and provisional_contact_number is null
    )
    or
    (
      client_stage_at_booking = 'new'
      and length(btrim(coalesce(provisional_client_name, ''))) between 2 and 160
    )
  ),
  constraint appointments_booking_source_check check (
    booking_source in ('phone', 'walk_in')
  ),
  constraint appointments_mode_check check (
    appointment_mode in ('in_person', 'telecounseling')
  ),
  constraint appointments_time_window_check check (
    ends_at > starts_at
    and ends_at <= starts_at + interval '8 hours'
  ),
  constraint appointments_status_check check (
    status in (
      'scheduled',
      'confirmed',
      'arrived',
      'intake_in_progress',
      'in_session',
      'completed',
      'cancelled',
      'no_show'
    )
  ),
  constraint appointments_client_required_for_care_check check (
    status not in ('intake_in_progress', 'in_session', 'completed')
    or client_id is not null
  ),
  constraint appointments_cancellation_reason_check check (
    status <> 'cancelled'
    or length(btrim(coalesce(cancellation_reason, ''))) between 2 and 240
  ),
  constraint appointments_scheduling_note_check check (
    scheduling_note is null or length(btrim(scheduling_note)) <= 500
  ),
  constraint appointments_provisional_contact_check check (
    provisional_contact_number is null
    or length(btrim(provisional_contact_number)) between 7 and 40
  )
);

alter table public.appointments
  add constraint appointments_no_provider_overlap
  exclude using gist (
    provider_profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status not in ('cancelled', 'no_show'));

create index appointments_starts_at_idx
  on public.appointments (starts_at);
create index appointments_provider_starts_at_idx
  on public.appointments (provider_profile_id, starts_at);
create index appointments_client_starts_at_idx
  on public.appointments (client_id, starts_at desc)
  where client_id is not null;
create index appointments_status_starts_at_idx
  on public.appointments (status, starts_at);
create index appointments_pending_intake_idx
  on public.appointments (starts_at)
  where client_stage_at_booking = 'new' and client_id is null;

insert into public.appointment_services (name, default_duration_minutes, is_active)
values
  ('Initial Consultation', 60, true),
  ('Individual Counseling', 60, true),
  ('Follow-up Session', 45, true),
  ('Psychological Assessment', 120, true)
on conflict do nothing;

insert into public.clinic_hours (weekday, is_open, opens_at, closes_at)
values
  (0, false, null, null),
  (1, true, '08:00', '18:00'),
  (2, true, '08:00', '18:00'),
  (3, true, '08:00', '18:00'),
  (4, true, '08:00', '18:00'),
  (5, true, '08:00', '18:00'),
  (6, true, '08:00', '18:00')
on conflict (weekday) do nothing;

create or replace function public.hpc_appointment_transition_allowed(
  previous_status text,
  next_status text
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select
    previous_status = next_status
    or case previous_status
      when 'scheduled' then next_status in ('confirmed', 'arrived', 'cancelled', 'no_show')
      when 'confirmed' then next_status in ('scheduled', 'arrived', 'cancelled', 'no_show')
      when 'arrived' then next_status in ('intake_in_progress', 'in_session', 'cancelled', 'no_show')
      when 'intake_in_progress' then next_status in ('in_session', 'cancelled')
      when 'in_session' then next_status in ('completed', 'cancelled')
      when 'cancelled' then next_status = 'scheduled'
      when 'no_show' then next_status = 'scheduled'
      else false
    end;
$function$;

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

    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    return new;
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
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Psychologists and counselors cannot change appointment details.';
    end if;
  elsif actor_role not in ('admin', 'staff') then
    raise exception 'Your role cannot change appointments.';
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
  provider_role text;
  provider_representative text;
  client_representative text;
  client_status_value text;
  service_duration integer;
  has_recurring_availability boolean;
  has_available_override boolean;
  has_unavailable_override boolean;
begin
  if new.status in ('cancelled', 'no_show') then
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

  select
    public.hpc_normalized_role(p.role),
    nullif(btrim(coalesce(p.hpc_representative_name, '')), '')
  into provider_role, provider_representative
  from public.profiles p
  where p.id = new.provider_profile_id
    and p.is_active = true;

  if provider_role <> 'psychologist / counselor'
     or provider_representative is null then
    raise exception 'Choose an active psychologist or counselor with an HPC Representative assignment.';
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
    raise exception 'The psychologist or counselor is not available for this time.';
  end if;

  return new;
end;
$function$;

create or replace function public.hpc_stamp_calendar_actor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_role <> 'service_role' then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$function$;

create or replace function public.hpc_audit_calendar_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_profile public.profiles%rowtype;
  target_row_id text;
  action_name text;
  detail_payload jsonb;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select * into actor_profile
  from public.profiles
  where id = auth.uid() and is_active = true;

  if actor_profile.id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'clinic_hours' then
    target_row_id := coalesce(new.weekday, old.weekday)::text;
  elsif tg_op = 'DELETE' then
    target_row_id := old.id::text;
  else
    target_row_id := new.id::text;
  end if;

  if tg_op = 'DELETE' then
    action_name := 'Deleted';
  elsif tg_op = 'INSERT' then
    action_name := 'Created';
  else
    action_name := case
      when tg_table_name = 'appointments' and new.status is distinct from old.status
        then 'Status changed to ' || new.status
      else 'Updated'
    end;
  end if;

  detail_payload := jsonb_build_object(
    'source', 'database_trigger',
    'table', tg_table_name
  );

  if tg_table_name = 'appointments' then
    detail_payload := detail_payload || jsonb_build_object(
      'provider_profile_id', coalesce(new.provider_profile_id, old.provider_profile_id),
      'starts_at', coalesce(new.starts_at, old.starts_at),
      'status', coalesce(new.status, old.status),
      'client_stage_at_booking', coalesce(
        new.client_stage_at_booking,
        old.client_stage_at_booking
      )
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

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function public.hpc_begin_appointment_intake(
  target_appointment_id uuid
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  appointment_row public.appointments%rowtype;
  representative_name text;
  new_client_id uuid;
begin
  if not public.hpc_has_required_aal()
     or not public.hpc_current_profile_has_role(array['admin', 'staff']) then
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

drop trigger if exists appointment_services_updated_at on public.appointment_services;
create trigger appointment_services_updated_at
  before update on public.appointment_services
  for each row execute function public.hpc_set_updated_at();
drop trigger if exists appointment_services_actor on public.appointment_services;
create trigger appointment_services_actor
  before insert or update on public.appointment_services
  for each row execute function public.hpc_stamp_calendar_actor();

drop trigger if exists clinic_hours_updated_at on public.clinic_hours;
create trigger clinic_hours_updated_at
  before update on public.clinic_hours
  for each row execute function public.hpc_set_updated_at();
drop trigger if exists clinic_hours_actor on public.clinic_hours;
create trigger clinic_hours_actor
  before insert or update on public.clinic_hours
  for each row execute function public.hpc_stamp_calendar_actor();

drop trigger if exists care_team_availability_updated_at on public.care_team_availability;
create trigger care_team_availability_updated_at
  before update on public.care_team_availability
  for each row execute function public.hpc_set_updated_at();
drop trigger if exists care_team_availability_actor on public.care_team_availability;
create trigger care_team_availability_actor
  before insert or update on public.care_team_availability
  for each row execute function public.hpc_stamp_calendar_actor();

drop trigger if exists care_team_availability_overrides_updated_at
  on public.care_team_availability_overrides;
create trigger care_team_availability_overrides_updated_at
  before update on public.care_team_availability_overrides
  for each row execute function public.hpc_set_updated_at();
drop trigger if exists care_team_availability_overrides_actor
  on public.care_team_availability_overrides;
create trigger care_team_availability_overrides_actor
  before insert or update on public.care_team_availability_overrides
  for each row execute function public.hpc_stamp_calendar_actor();

drop trigger if exists appointments_10_write_rules on public.appointments;
create trigger appointments_10_write_rules
  before insert or update on public.appointments
  for each row execute function public.hpc_enforce_appointment_write_rules();
drop trigger if exists appointments_20_validate_schedule on public.appointments;
create trigger appointments_20_validate_schedule
  before insert or update on public.appointments
  for each row execute function public.hpc_validate_appointment_schedule();
drop trigger if exists appointments_30_updated_at on public.appointments;
create trigger appointments_30_updated_at
  before update on public.appointments
  for each row execute function public.hpc_set_updated_at();

drop trigger if exists appointment_services_audit on public.appointment_services;
create trigger appointment_services_audit
  after insert or update on public.appointment_services
  for each row execute function public.hpc_audit_calendar_change();
drop trigger if exists clinic_hours_audit on public.clinic_hours;
create trigger clinic_hours_audit
  after update on public.clinic_hours
  for each row execute function public.hpc_audit_calendar_change();
drop trigger if exists care_team_availability_audit on public.care_team_availability;
create trigger care_team_availability_audit
  after insert or update or delete on public.care_team_availability
  for each row execute function public.hpc_audit_calendar_change();
drop trigger if exists care_team_availability_overrides_audit
  on public.care_team_availability_overrides;
create trigger care_team_availability_overrides_audit
  after insert or update or delete on public.care_team_availability_overrides
  for each row execute function public.hpc_audit_calendar_change();
drop trigger if exists appointments_audit on public.appointments;
create trigger appointments_audit
  after insert or update on public.appointments
  for each row execute function public.hpc_audit_calendar_change();

alter table public.appointment_services enable row level security;
alter table public.clinic_hours enable row level security;
alter table public.care_team_availability enable row level security;
alter table public.care_team_availability_overrides enable row level security;
alter table public.appointments enable row level security;

revoke all on table public.appointment_services from public, anon, authenticated;
revoke all on table public.clinic_hours from public, anon, authenticated;
revoke all on table public.care_team_availability from public, anon, authenticated;
revoke all on table public.care_team_availability_overrides from public, anon, authenticated;
revoke all on table public.appointments from public, anon, authenticated;

grant select, insert, update on table public.appointment_services to authenticated;
grant select, update on table public.clinic_hours to authenticated;
grant select, insert, update, delete on table public.care_team_availability to authenticated;
grant select, insert, update, delete on table public.care_team_availability_overrides
  to authenticated;
grant select, insert, update on table public.appointments to authenticated;

create policy "appointment services select active members"
  on public.appointment_services for select to authenticated
  using (public.is_hpc_profile_member());
create policy "appointment services insert admins"
  on public.appointment_services for insert to authenticated
  with check (public.hpc_current_profile_has_role(array['admin']));
create policy "appointment services update admins"
  on public.appointment_services for update to authenticated
  using (public.hpc_current_profile_has_role(array['admin']))
  with check (public.hpc_current_profile_has_role(array['admin']));

create policy "clinic hours select active members"
  on public.clinic_hours for select to authenticated
  using (public.is_hpc_profile_member());
create policy "clinic hours update admins"
  on public.clinic_hours for update to authenticated
  using (public.hpc_current_profile_has_role(array['admin']))
  with check (public.hpc_current_profile_has_role(array['admin']));

create policy "availability select permitted members"
  on public.care_team_availability for select to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or profile_id = (select auth.uid())
  );
create policy "availability insert own"
  on public.care_team_availability for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );
create policy "availability update own"
  on public.care_team_availability for update to authenticated
  using (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  )
  with check (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );
create policy "availability delete own"
  on public.care_team_availability for delete to authenticated
  using (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );

create policy "availability overrides select permitted members"
  on public.care_team_availability_overrides for select to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or profile_id = (select auth.uid())
  );
create policy "availability overrides insert own"
  on public.care_team_availability_overrides for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );
create policy "availability overrides update own"
  on public.care_team_availability_overrides for update to authenticated
  using (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  )
  with check (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );
create policy "availability overrides delete own"
  on public.care_team_availability_overrides for delete to authenticated
  using (
    profile_id = (select auth.uid())
    and public.hpc_current_profile_has_role(array['psychologist / counselor'])
  );

create policy "appointments select by calendar role"
  on public.appointments for select to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      public.hpc_current_profile_has_role(array['psychologist / counselor'])
      and provider_profile_id = (select auth.uid())
    )
  );
create policy "appointments insert operations"
  on public.appointments for insert to authenticated
  with check (public.hpc_current_profile_has_role(array['admin', 'staff']));
create policy "appointments update by calendar role"
  on public.appointments for update to authenticated
  using (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      public.hpc_current_profile_has_role(array['psychologist / counselor'])
      and provider_profile_id = (select auth.uid())
    )
  )
  with check (
    public.hpc_current_profile_has_role(array['admin', 'staff'])
    or (
      public.hpc_current_profile_has_role(array['psychologist / counselor'])
      and provider_profile_id = (select auth.uid())
    )
  );

create policy "appointment services require mfa"
  on public.appointment_services as restrictive for all to authenticated
  using (public.hpc_has_required_aal())
  with check (public.hpc_has_required_aal());
create policy "clinic hours require mfa"
  on public.clinic_hours as restrictive for all to authenticated
  using (public.hpc_has_required_aal())
  with check (public.hpc_has_required_aal());
create policy "availability require mfa"
  on public.care_team_availability as restrictive for all to authenticated
  using (public.hpc_has_required_aal())
  with check (public.hpc_has_required_aal());
create policy "availability overrides require mfa"
  on public.care_team_availability_overrides as restrictive for all to authenticated
  using (public.hpc_has_required_aal())
  with check (public.hpc_has_required_aal());
create policy "appointments require mfa"
  on public.appointments as restrictive for all to authenticated
  using (public.hpc_has_required_aal())
  with check (public.hpc_has_required_aal());

revoke execute on function public.hpc_appointment_transition_allowed(text, text)
  from public, anon;
revoke execute on function public.hpc_enforce_appointment_write_rules()
  from public, anon, authenticated;
revoke execute on function public.hpc_validate_appointment_schedule()
  from public, anon, authenticated;
revoke execute on function public.hpc_stamp_calendar_actor()
  from public, anon, authenticated;
revoke execute on function public.hpc_audit_calendar_change()
  from public, anon, authenticated;
revoke execute on function public.hpc_begin_appointment_intake(uuid)
  from public, anon;
grant execute on function public.hpc_begin_appointment_intake(uuid) to authenticated;

-- Extend the 0.2.2 merge-only backup restore with the additive 0.3.0 tables.
create or replace function public.hpc_restore_backup_service(
  p_backup jsonb,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  table_item record;
  table_rows jsonb;
  column_list text;
  update_list text;
  statement_text text;
  affected_count integer;
  restored_counts jsonb := '{}'::jsonb;
  backup_format integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_role <> 'service_role' then
    raise exception 'Restore service is not available to this session.';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'The restore package is not a JSON object.';
  end if;

  backup_format := coalesce((p_backup ->> 'format_version')::integer, 0);
  if backup_format <> 2 then
    raise exception 'Unsupported backup format version.';
  end if;

  if jsonb_typeof(p_backup -> 'tables') <> 'object' then
    raise exception 'The restore package does not contain a tables object.';
  end if;

  -- Merge-only restore. Records absent from the package are never deleted.
  -- Profiles remain excluded because Auth identities are managed by Supabase Auth.
  for table_item in
    select *
    from (values
      (1, 'client_categories'::text, 'id'::text),
      (2, 'clinic_settings'::text, 'id'::text),
      (3, 'appointment_services'::text, 'id'::text),
      (4, 'clinic_hours'::text, 'weekday'::text),
      (5, 'clients'::text, 'id'::text),
      (6, 'care_team_availability'::text, 'id'::text),
      (7, 'care_team_availability_overrides'::text, 'id'::text),
      (8, 'appointments'::text, 'id'::text),
      (9, 'client_children'::text, 'id'::text),
      (10, 'client_4ps'::text, 'id'::text),
      (11, 'client_cssrs'::text, 'client_id'::text),
      (12, 'progress_notes'::text, 'id'::text),
      (13, 'client_documents'::text, 'id'::text),
      (14, 'client_assessments'::text, 'id'::text),
      (15, 'dashboard_announcements'::text, 'id'::text)
    ) as restore_tables(sort_order, table_name, conflict_column)
    order by sort_order
  loop
    table_rows := coalesce(p_backup -> 'tables' -> table_item.table_name, '[]'::jsonb);

    if jsonb_typeof(table_rows) <> 'array' then
      raise exception 'Backup table % must be an array.', table_item.table_name;
    end if;

    if jsonb_array_length(table_rows) = 0 then
      restored_counts := restored_counts || jsonb_build_object(table_item.table_name, 0);
      continue;
    end if;

    select
      string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum),
      string_agg(
        format('%I = excluded.%I', attribute.attname, attribute.attname),
        ', ' order by attribute.attnum
      ) filter (where attribute.attname <> table_item.conflict_column)
    into column_list, update_list
    from pg_attribute as attribute
    where attribute.attrelid = format('public.%I', table_item.table_name)::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
      and attribute.attgenerated = '';

    statement_text := format(
      'insert into public.%I (%s) '
      || 'select %s from jsonb_populate_recordset(null::public.%I, $1) '
      || 'on conflict (%I) do update set %s',
      table_item.table_name,
      column_list,
      column_list,
      table_item.table_name,
      table_item.conflict_column,
      update_list
    );

    execute statement_text using table_rows;
    get diagnostics affected_count = row_count;
    restored_counts := restored_counts || jsonb_build_object(table_item.table_name, affected_count);
  end loop;

  insert into public.audit_logs (
    actor_user_id,
    module,
    action,
    target_type,
    target_label,
    details
  ) values (
    p_actor_user_id,
    'Settings',
    'Restored Clinic Backup',
    'backup',
    coalesce(p_backup ->> 'export_id', p_backup ->> 'exported_at', 'Clinic backup'),
    jsonb_build_object(
      'restore_mode', 'merge',
      'format_version', backup_format,
      'source_project_ref', p_backup ->> 'source_project_ref',
      'restored_counts', restored_counts,
      'profiles_restored', false,
      'storage_files_restored', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'mode', 'merge',
    'restored_counts', restored_counts,
    'profiles_restored', false,
    'storage_files_restored', false
  );
end;
$function$;

revoke all on function public.hpc_restore_backup_service(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.hpc_restore_backup_service(jsonb, uuid)
  to service_role;
