import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import {
  addCalendarDays,
  getCalendarDates,
  startOfCalendarWeek,
  toPhilippineIso,
} from "../src/features/calendar/calendarDate";

const readProjectFile = (path: string) => readFile(resolve(process.cwd(), path), "utf8");
const migrationPath =
  "supabase/migrations/20260823042408_appointment_calendar_0_3_0.sql";
const helperGrantMigrationPath =
  "supabase/migrations/20260823050823_appointment_calendar_authenticated_helper_grant.sql";
const repairMigrationPath =
  "supabase/migrations/20260823065214_appointment_calendar_0_3_1_repairs.sql";
const timelineMigrationPath =
  "supabase/migrations/20260823081512_appointment_status_timeline_0_3_2.sql";

test("calendar dates use Monday weeks and explicit Philippine offsets", () => {
  expect(startOfCalendarWeek("2026-08-23")).toBe("2026-08-17");
  expect(getCalendarDates("2026-08-23", "week")).toEqual([
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
  ]);
  expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(toPhilippineIso("2026-08-23", "09:30")).toBe(
    "2026-08-23T09:30:00+08:00"
  );
});

test("database prevents double-booking and validates real availability", async () => {
  const migration = await readProjectFile(migrationPath);

  expect(migration).toContain("create extension if not exists btree_gist");
  expect(migration).toContain("constraint appointments_no_provider_overlap");
  expect(migration).toContain("exclude using gist");
  expect(migration).toContain("tstzrange(starts_at, ends_at, '[)') with &&");
  expect(migration).toContain("at time zone 'Asia/Manila'");
  expect(migration).toContain("The appointment is outside the configured clinic hours.");
  expect(migration).toContain("The psychologist or counselor is not available for this time.");
  expect(migration).toContain("The appointment length must match the selected service duration.");
});

test("first-timer intake is transactional and cannot be linked directly", async () => {
  const migration = await readProjectFile(migrationPath);

  expect(migration).toContain("client_stage_at_booking text not null");
  expect(migration).toContain("The client stage recorded at booking is immutable.");
  expect(migration).toContain("First-timer client links must be created through Begin Intake.");
  expect(migration).toContain("create or replace function public.hpc_begin_appointment_intake");
  expect(migration).toContain("Mark the first-timer Arrived before beginning intake.");
  expect(migration).toContain("appointments_client_required_for_care_check");
  expect(migration).toContain("status not in ('intake_in_progress', 'in_session', 'completed')");
  expect(migration).toContain("insert into public.clients");
  expect(migration).toContain("status = 'intake_in_progress'");
});

test("calendar access is MFA-protected and role-scoped in the database", async () => {
  const migration = await readProjectFile(migrationPath);
  const helperGrantMigration = await readProjectFile(helperGrantMigrationPath);

  expect(migration).toContain('create policy "appointments require mfa"');
  expect(migration).toContain("array['admin', 'staff']");
  expect(migration).toContain("array['psychologist / counselor']");
  expect(migration).toContain("provider_profile_id = (select auth.uid())");
  expect(migration).toContain("Only Admin and Staff accounts can create appointments.");
  expect(migration).toContain("Psychologists and counselors can update only their own appointments.");
  expect(migration).toContain("revoke all on table public.appointments from public, anon, authenticated");
  expect(migration).toContain("grant select, insert, update on table public.appointments to authenticated");
  expect(helperGrantMigration).toContain(
    "grant execute on function public.hpc_appointment_transition_allowed(text, text)"
  );
  expect(helperGrantMigration).toContain("to authenticated");
});

test("calendar data is covered by backup and merge restore", async () => {
  const backupSource = await readProjectFile("src/appShared.ts");
  const restoreService = await readProjectFile(
    "supabase/functions/restore-clinic-backup/index.ts"
  );
  const migration = await readProjectFile(migrationPath);
  const tableNames = [
    "appointment_services",
    "clinic_hours",
    "care_team_availability",
    "care_team_availability_overrides",
    "appointments",
  ];

  tableNames.forEach((tableName) => {
    expect(backupSource).toContain(`key: "${tableName}"`);
    expect(restoreService).toContain(`"${tableName}"`);
    expect(migration).toContain(`'${tableName}'::text`);
  });
});

test("0.3.1 repairs shared audit writes and protects dated availability", async () => {
  const migration = await readProjectFile(repairMigrationPath);

  expect(migration).toContain("row_before jsonb");
  expect(migration).toContain("row_after jsonb");
  expect(migration).toContain("to_jsonb(old)");
  expect(migration).toContain("to_jsonb(new)");
  expect(migration).not.toContain("new.status is distinct from old.status");
  expect(migration).toContain("care_team_availability_overrides_no_overlap");
  expect(migration).toContain("tsrange(");
  expect(migration).toContain("with &&");
});

test("0.3.1 recognizes HPC Representatives and keeps removals recoverable", async () => {
  const migration = await readProjectFile(repairMigrationPath);
  const controller = await readProjectFile(
    "src/features/calendar/useCalendarController.ts"
  );

  expect(migration).toContain("add column removed_at timestamptz");
  expect(migration).toContain("add column removed_by uuid");
  expect(migration).toContain("Removed from calendar");
  expect(migration).toContain("Appointments linked to care cannot be removed");
  expect(migration).toContain("nullif(btrim(coalesce(p.hpc_representative_name, '')), '') is not null");
  expect(controller).toContain('.is("removed_at", null)');
  expect(controller).toContain("hasHpcRepresentativeAssignment(member.hpc_representative_name)");
  expect(controller).toContain("removeAppointment");
});

test("0.3.2 records immutable server-timed appointment milestones", async () => {
  const migration = await readProjectFile(timelineMigrationPath);
  const controller = await readProjectFile(
    "src/features/calendar/useCalendarController.ts"
  );
  const workspace = await readProjectFile(
    "src/features/calendar/CalendarSection.tsx"
  );

  expect(migration).toContain("create table public.appointment_status_events");
  expect(migration).toContain("recorded_at timestamptz not null default now()");
  expect(migration).toContain("after insert or update of status on public.appointments");
  expect(migration).toContain("insert into public.appointment_status_events");
  expect(migration).toContain("auth.uid()");
  expect(migration).toContain('create policy "appointment status events require mfa"');
  expect(migration).toContain("grant select on table public.appointment_status_events to authenticated");
  expect(migration).toContain("migration_snapshot");
  expect(controller).toContain('.from("appointment_status_events")');
  expect(controller).toContain('status !== "intake_in_progress"');
  expect(workspace).toContain('type ScheduleWorkspaceMode = "calendar" | "status_board"');
  expect(workspace).toContain("Mark confirmed");
  expect(workspace).toContain("Start session");
  expect(workspace).not.toContain("draggable=");
});

test("0.3.2 backup and restore include appointment status history", async () => {
  const backupSource = await readProjectFile("src/appShared.ts");
  const restoreService = await readProjectFile(
    "supabase/functions/restore-clinic-backup/index.ts"
  );
  const migration = await readProjectFile(timelineMigrationPath);

  expect(backupSource).toContain('key: "appointment_status_events"');
  expect(restoreService).toContain('"appointment_status_events"');
  expect(migration).toContain("'appointment_status_events'::text");
});

test("0.3.3 keeps modal feedback local and bounds large client pickers", async () => {
  const controller = await readProjectFile(
    "src/features/calendar/useCalendarController.ts"
  );
  const workspace = await readProjectFile(
    "src/features/calendar/CalendarSection.tsx"
  );

  expect(workspace).toContain("const CLIENT_PICKER_RESULT_LIMIT = 12");
  expect(workspace).toContain("matchingClients.slice(0, CLIENT_PICKER_RESULT_LIMIT)");
  expect(workspace).toContain('type="search"');
  expect(workspace).toContain("AppointmentActionDialog");
  expect(workspace).toContain('className="calendar-modal-status"');
  expect(workspace).not.toContain("window.prompt");
  expect(controller).toContain("refreshAfterMutation");
  expect(controller).toContain("preserveMessage: true");
  expect(controller).toContain("Intake started. The new client record is ready.");
});
