# Appointment Calendar architecture

The Appointment Calendar is an internal clinic workspace. Clients book by
calling or visiting the clinic; there is no client-facing portal in this
release.

## Roles

- **Staff** book and manage appointments and review team availability.
- **Admin** inherit Staff controls and configure clinic hours, services, and
  appointment lengths.
- **Psychologist / Counselor** manage their own availability and view only the
  appointments allowed by their clinical assignment.
- Any active account with an HPC Representative assignment is treated as a
  clinician for scheduling, regardless of its display role.

## Existing clients and first-timers

Existing-client appointments reference `appointments.client_id`. A first-timer
remains a provisional appointment and does not become a client record until
Staff begins intake after arrival. The intake operation creates and links the
client transactionally while preserving the appointment's original
`client_stage_at_booking` for reporting.

Appointment records own scheduling details such as time, clinician, service,
mode, status, and booking source. Client records own verified identity,
demographics, intake, and clinical information.

## Availability and conflict prevention

- Recurring availability defines a clinician's usual weekly hours.
- Dated overrides mark a specific period available or unavailable.
- Clinic hours and active services constrain valid appointment times.
- PostgreSQL constraints and guarded database functions prevent overlapping
  clinician availability, provider double-booking, and conflicting client
  appointments.
- Times are stored as timestamps and displayed in `Asia/Manila`.

## Status workflow

The normal sequence is:

`Scheduled → Confirmed → Arrived → Intake in Progress → In Session → Completed`

Existing clients skip Intake in Progress. Cancelled and No-show are controlled
branches. Every milestone is written to an immutable server-timed history with
the acting account recorded.

## Privacy boundary

Calendar entries contain operational scheduling information, not diagnoses,
case notes, or screening results. The public source contains only fictional
examples and no real appointment data.

## Verification

After applying the migrations to a nonproduction project, run:

1. `docs/deployment-preflight-readonly.sql`
2. `docs/supabase-post-migration-verification.sql`
3. `docs/verify-appointment-calendar.sql`
4. `docs/verify-database-hardening.sql`
5. `docs/verify-live-auth-triggers.sql`

The behavioral verification blocks run inside transactions that are rolled
back. Review every script before executing it against a database.
