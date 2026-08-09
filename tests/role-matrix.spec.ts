import { expect, test } from "@playwright/test";

import {
  CARE_TEAM_ROLE_OPTIONS,
  canCreateClientRecords,
  canEditClientClinicalRecords,
  canUseAllRepresentativeAnalytics,
  canUseIndividualRepresentativeAnalytics,
  getCareTeamRoleCapabilities,
  getProfileDisplayRole,
  shouldLockClientRepresentativeToAssigned,
} from "../src/security/rolePolicy";

test("only the three approved roles can be assigned", () => {
  expect(CARE_TEAM_ROLE_OPTIONS).toEqual([
    "Admin",
    "Psychologist / Counselor",
    "Staff",
  ]);
});

test("legacy CEO resolves to Admin while Intern receives no capabilities", () => {
  expect(getProfileDisplayRole("CEO")).toBe("Admin");
  expect(getCareTeamRoleCapabilities("Intern")).toEqual({
    canManageCareTeam: false,
    canManageAdminAccounts: false,
    canManageClientCategoriesAndBackups: false,
    canViewAuditLogs: false,
    canManageDashboardAnnouncements: false,
    isClientAccessLimitedToAssignedRepresentative: false,
  });
});

test("Admin has complete administration capabilities", () => {
  const capabilities = getCareTeamRoleCapabilities("Admin");
  expect(capabilities.canManageCareTeam).toBe(true);
  expect(capabilities.canManageAdminAccounts).toBe(true);
  expect(capabilities.canManageClientCategoriesAndBackups).toBe(true);
  expect(capabilities.canViewAuditLogs).toBe(true);
  expect(canUseAllRepresentativeAnalytics("Admin")).toBe(true);
  expect(canCreateClientRecords("Admin")).toBe(true);
});

test("Staff sees full clinic data but cannot administer Admins or view System Log", () => {
  const capabilities = getCareTeamRoleCapabilities("Staff");
  expect(capabilities.canManageCareTeam).toBe(true);
  expect(capabilities.canManageAdminAccounts).toBe(false);
  expect(capabilities.canManageClientCategoriesAndBackups).toBe(true);
  expect(capabilities.canViewAuditLogs).toBe(false);
  expect(canUseAllRepresentativeAnalytics("Staff")).toBe(true);
  expect(canUseIndividualRepresentativeAnalytics("Staff")).toBe(true);
  expect(canEditClientClinicalRecords("Staff")).toBe(true);
});

test("Psychologist or Counselor is limited to assigned clients and analytics", () => {
  const role = "Psychologist / Counselor";
  const capabilities = getCareTeamRoleCapabilities(role);
  expect(capabilities.isClientAccessLimitedToAssignedRepresentative).toBe(true);
  expect(capabilities.canManageCareTeam).toBe(false);
  expect(capabilities.canManageClientCategoriesAndBackups).toBe(false);
  expect(capabilities.canViewAuditLogs).toBe(false);
  expect(capabilities.canManageDashboardAnnouncements).toBe(true);
  expect(canUseAllRepresentativeAnalytics(role)).toBe(false);
  expect(canUseIndividualRepresentativeAnalytics(role)).toBe(false);
  expect(shouldLockClientRepresentativeToAssigned(role)).toBe(true);
  expect(canEditClientClinicalRecords(role)).toBe(true);
});

test("unknown roles fail closed", () => {
  expect(getProfileDisplayRole("Owner")).toBe("Unassigned");
  expect(canCreateClientRecords("Owner")).toBe(false);
  expect(canEditClientClinicalRecords("Owner")).toBe(false);
  expect(canUseAllRepresentativeAnalytics("Owner")).toBe(false);
});
