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

test("Staff client creation requires an active clinical representative and cannot delete files", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/20260809000200_staff_client_assignment_permissions.sql"
  );

  expect(migration).toContain("hpc_is_assignable_representative");
  expect(migration).toContain("'psychologist / counselor'");
  expect(migration).toContain("hpc_profile_can_create_client(hpc_representative)");
  expect(migration).toContain("hpc_profile_can_delete_client_documents(client_id)");
  expect(migration).toContain("hpc_profile_can_delete_client_assessments(client_id)");
  expect(migration).toContain("grant update (document_name)");
  expect(migration).toContain("grant update (assessment_name)");
});

test("the Admin representative is always Clinic Administrator", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/20260809000300_assign_admin_representative.sql"
  );

  expect(migration).toContain("set hpc_representative_name = 'Clinic Administrator'");
  expect(migration).toContain("new.hpc_representative_name := 'Clinic Administrator'");
  expect(migration).toContain("hpc_profiles_enforce_representative_assignment");
});

test("an MFA-verified inactive account can identify its own deactivated status only", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/20260809000400_inactive_profile_status_message.sql"
  );

  expect(migration).toContain('id = auth.uid()');
  expect(migration).toContain('is_active = true');
  expect(migration).toContain('or public.hpc_has_required_aal()');
  expect(migration).not.toContain('is_active = false');
});

test("AI narrative generation is limited to clinical roles on the server", async () => {
  const source = await readProjectFile(
    "supabase/functions/generate-4ps-narrative/index.ts"
  );

  const allowedRolesDeclaration = source.slice(
    source.indexOf("const allowedRoles"),
    source.indexOf("const fourPsRows")
  );

  expect(allowedRolesDeclaration).toContain('"Admin"');
  expect(allowedRolesDeclaration).toContain('"Psychologist / Counselor"');
  expect(allowedRolesDeclaration).not.toContain('"Staff"');
  expect(source).toContain('callerRole === "Psychologist / Counselor"');
});

test("AI narrative generation uses the supported stable Gemini model contract", async () => {
  const source = await readProjectFile(
    "supabase/functions/generate-4ps-narrative/index.ts"
  );

  expect(source).toContain('Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"');
  expect(source).not.toContain('"gemini-2.5-flash"');
  expect(source).not.toContain("temperature:");
  expect(source).not.toContain("topP:");
  expect(source).not.toContain("topK:");
  expect(source).toContain('thinkingLevel: "low"');
  expect(source).toContain("maxOutputTokens: 3200");
  expect(source).toContain('finishReason !== "STOP"');
  expect(source).toContain("Gemini returned an incomplete narrative draft.");
  expect(source).toContain('const narrativePromptVersion = "4ps-narrative-v3"');
});

test("phone upload remains disabled on both frontend and server while deferred", async () => {
  const shared = await readProjectFile("src/appShared.ts");
  const filesTab = await readProjectFile("src/features/clients/ClientFilesTab.tsx");
  const validationService = await readProjectFile(
    "supabase/functions/validate-upload/index.ts"
  );

  expect(shared).toContain("VITE_ENABLE_MOBILE_UPLOAD");
  expect(filesTab).toContain("MOBILE_UPLOAD_ENABLED ?");
  expect(validationService).toContain('Deno.env.get("MOBILE_UPLOAD_ENABLED")');
  expect(validationService).toContain("isMobileContext && !mobileUploadEnabled");
  expect(validationService).toContain("Upload from Phone is disabled in this release.");
});

test("clinic information is editable only by MFA-verified Admin and Staff accounts", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/20260809000500_experience_improvements.sql"
  );

  expect(migration).toContain('create table if not exists public.clinic_settings');
  expect(migration).toContain("auth.jwt() ->> 'aal') = 'aal2'");
  expect(migration).toContain("array['admin', 'staff']");
  expect(migration).toContain('id = 1');
});

test("backup restore is Admin-only, fresh-MFA protected, and merge-only", async () => {
  const service = await readProjectFile(
    "supabase/functions/restore-clinic-backup/index.ts"
  );
  const migration = await readProjectFile(
    "supabase/migrations/20260809000500_experience_improvements.sql"
  );

  expect(service).toContain("requireFreshMfaSession(token)");
  expect(service).toContain('!== "admin"');
  expect(service).toContain("Only an Admin can restore a clinic backup.");
  expect(migration).toContain("on conflict (%I) do update");
  expect(migration).toContain("Records absent from the package are never deleted");
  expect(migration).toContain("'profiles_restored', false");
  expect(migration).toContain("'storage_files_restored', false");
  expect(migration).not.toContain("delete from public.clients");
});

test("update checks require an active MFA-verified account", async () => {
  const source = await readProjectFile("supabase/functions/check-app-update/index.ts");

  expect(source).toContain("hasRequiredMfa(token)");
  expect(source).toContain("profile.is_active === false");
  expect(source).toContain('.from("app_releases")');
});

test("all Supabase auth emails use the same Clinic security template", async () => {
  const templateFiles = [
    "invite.html",
    "confirmation.html",
    "recovery.html",
    "magic_link.html",
    "email_change.html",
    "reauthentication.html",
    "password_changed_notification.html",
    "email_changed_notification.html",
    "phone_changed_notification.html",
    "identity_linked_notification.html",
    "identity_unlinked_notification.html",
    "mfa_added_notification.html",
    "mfa_removed_notification.html",
  ];

  for (const fileName of templateFiles) {
    const template = await readProjectFile(`supabase/email-templates/${fileName}`);
    expect(template).toContain("CLINIC");
    expect(template).toContain("HPC Client Management");
    expect(template).toContain("does not contain client information");
    expect(template).not.toContain("<script");
  }
});
