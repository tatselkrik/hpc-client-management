import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const readProjectFile = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("invitation service never accepts or creates administrator-shared passwords", async () => {
  const source = await readProjectFile("supabase/functions/invite-care-team-member/index.ts");

  expect(source).toContain("inviteUserByEmail");
  expect(source).not.toContain("temporary_password");
  expect(source).not.toContain("admin.createUser");
  expect(source).not.toContain("admin.deleteUser");
  expect(source).toContain('callerRole === "Staff" && role === "Admin"');
});

test("Staff cannot edit or deactivate an Admin in protected services", async () => {
  const updateService = await readProjectFile(
    "supabase/functions/update-care-team-member-role/index.ts"
  );
  const deactivateService = await readProjectFile(
    "supabase/functions/remove-care-team-member/index.ts"
  );

  expect(updateService).toContain(
    'callerRole === "Staff" && (previousRole === "Admin" || nextRole === "Admin")'
  );
  expect(deactivateService).toContain(
    'callerRole === "Staff" && targetRole === "Admin"'
  );
  expect(deactivateService).not.toContain("deleteUser(");
  expect(deactivateService).toContain("is_active: false");
});

test("Care Team administration requires a recently verified MFA method", async () => {
  const security = await readProjectFile("supabase/functions/_shared/security.ts");

  expect(security).toContain("claims.amr");
  expect(security).toContain('entry.method === "totp" || entry.method === "otp"');
  expect(security).toContain("nowSeconds - latestMfaVerification > maxAgeSeconds");
});

test("database migration deactivates Interns and requires MFA for protected records", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/20260807000100_security_hardening.sql"
  );

  expect(migration).toContain("like '%intern%'");
  expect(migration).toContain("is_active = false");
  expect(migration).toContain('create policy "hpc require mfa"');
  expect(migration).toContain("auth.jwt() ->> 'aal', '') = 'aal2'");
  expect(migration).toContain("revoke insert, update, delete on table public.audit_logs");
});

test("upload validation never deletes a path before caller ownership is established", async () => {
  const source = await readProjectFile("supabase/functions/validate-upload/index.ts");
  const authorizationMarker = source.indexOf("callerMayDeleteUpload = true");
  const guardedCleanupMarker = source.indexOf("if (callerMayDeleteUpload)");

  expect(authorizationMarker).toBeGreaterThan(-1);
  expect(guardedCleanupMarker).toBeGreaterThan(authorizationMarker);
  expect(source).not.toContain(
    'if (bucket !== rule.bucket) {\n    await removeRejectedUpload'
  );
});

test("staging uses a separate Windows identity and invitation scheme", async () => {
  const stagingConfig = await readProjectFile("src-tauri/tauri.staging.conf.json");

  expect(stagingConfig).toContain('"productName": "HPC Client Management Staging"');
  expect(stagingConfig).toContain('"identifier": "com.clinic.hpcclientmanagement.staging"');
  expect(stagingConfig).toContain('"hpc-client-management-staging"');
});

test("Edge Functions receive explicit least-privilege service grants", async () => {
  const grants = await readProjectFile(
    "supabase/migrations/20260809000100_edge_function_service_grants.sql"
  );

  expect(grants).toContain("grant select, insert, update");
  expect(grants).toContain("on table public.profiles");
  expect(grants).toContain("grant insert");
  expect(grants).toContain("on table public.audit_logs");
  expect(grants).not.toContain("grant all");
});
