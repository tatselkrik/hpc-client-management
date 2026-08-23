import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const migrationPath =
  "supabase/migrations/20260823105653_advisor_hardening_0_3_4.sql";
const repairMigrationPath =
  "supabase/migrations/20260823105827_advisor_hardening_0_3_4_repairs.sql";
const invokerGrantMigrationPath =
  "supabase/migrations/20260823110246_hardening_public_invoker_grant.sql";
const readProjectFile = (path: string) =>
  readFile(resolve(process.cwd(), path), "utf8");

test("0.3.4 moves privileged RLS helpers outside the exposed API schema", async () => {
  const migration = await readProjectFile(migrationPath);

  expect(migration).toContain("create schema if not exists hpc_private");
  expect(migration).toContain("security definer");
  expect(migration).toContain("set search_path = pg_catalog");
  expect(migration).toContain("revoke all on schema hpc_private from public, anon");
  expect(migration).toContain(
    "revoke execute on all functions in schema public from public, anon, authenticated"
  );
  expect(migration).toContain(
    "grant execute on all functions in schema hpc_private to authenticated"
  );
  expect(migration).not.toContain("grant execute on all functions in schema public");
});

test("0.3.4 keeps only invoker RPCs exposed to authenticated users", async () => {
  const migration = await readProjectFile(migrationPath);
  const invokerGrantMigration = await readProjectFile(invokerGrantMigrationPath);

  expect(migration).toContain("create or replace function public.log_audit_event");
  expect(migration).toContain("security invoker");
  expect(migration).toContain("create trigger hpc_stamp_client_audit_event");
  expect(migration).toContain("new.actor_user_id := auth.uid()");
  expect(migration).toContain("new.created_at := now()");
  expect(migration).toContain("details ->> 'source' = 'client_reported'");
  expect(migration).toContain(
    "grant execute on function public.hpc_begin_appointment_intake(uuid)"
  );
  expect(invokerGrantMigration).toContain(
    "grant execute on function public.hpc_normalized_role(text) to authenticated"
  );
});

test("0.3.4 consolidates policies and optimizes stable auth checks", async () => {
  const migration = await readProjectFile(migrationPath);
  const repairMigration = await readProjectFile(repairMigrationPath);

  expect(migration).toContain(
    'drop policy if exists "hpc clients analytics raw select bridge"'
  );
  expect(migration).toContain(
    'create policy "hpc clients select accessible"'
  );
  expect(migration).toContain(
    'create policy "hpc profiles select permitted"'
  );
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(migration).toContain(
    "(select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))"
  );
  expect(repairMigration).toContain("((select auth.jwt()) ->> 'aal') = 'aal2'");
});

test("0.3.4 covers every foreign key reported by the advisor", async () => {
  const migration = await readProjectFile(migrationPath);
  const expectedIndexes = [
    "client_4ps_narrative_generated_by_idx",
    "client_4ps_updated_by_idx",
    "client_assessments_created_by_idx",
    "client_cssrs_created_by_idx",
    "client_documents_created_by_idx",
    "clients_created_by_idx",
    "clinic_settings_updated_by_idx",
    "dashboard_announcements_created_by_idx",
    "mobile_upload_sessions_created_by_idx",
    "progress_notes_created_by_idx",
  ];

  for (const indexName of expectedIndexes) {
    expect(migration).toContain(`create index if not exists ${indexName}`);
  }
});
