import { expect, test } from "@playwright/test";

import {
  CARE_TEAM_ROLE_OPTIONS,
  canCreateClientRecords,
  canDeleteClientAssessments,
  canDeleteClientDocuments,
  canEditClientClinicalRecords,
  canManageAppointments,
  canManageCalendarConfiguration,
  canManageClientAssessments,
  canManageClientDocuments,
  canManageOwnAvailability,
  canUpdateOwnAppointmentStatus,
  canViewAllAppointments,
  canUseAllRepresentativeAnalytics,
  canUseIndividualRepresentativeAnalytics,
  getCareTeamRoleCapabilities,
  getProfileDisplayRole,
  hasHpcRepresentativeAssignment,
  isRepresentativeAssignedRole,
  shouldLockClientRepresentativeToAssigned,
} from "../src/security/rolePolicy";

test("only the three approved roles can be assigned", () => {
  expect(CARE_TEAM_ROLE_OPTIONS).toEqual([
    "Admin",
    "Psychologist / Counselor",
    "Staff",
  ]);
});

test("only Admin and Psychologist or Counselor accounts receive client assignments", () => {
  expect(isRepresentativeAssignedRole("Admin")).toBe(true);
  expect(isRepresentativeAssignedRole("Psychologist / Counselor")).toBe(true);
  expect(isRepresentativeAssignedRole("Staff")).toBe(false);
});

test("calendar clinician identity follows the HPC Representative assignment", () => {
  expect(hasHpcRepresentativeAssignment("Clinic Administrator")).toBe(true);
  expect(hasHpcRepresentativeAssignment("  Staging Psych Test  ")).toBe(true);
  expect(hasHpcRepresentativeAssignment(null)).toBe(false);
  expect(hasHpcRepresentativeAssignment("   ")).toBe(false);
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
  expect(canEditClientClinicalRecords("Admin")).toBe(true);
  expect(canManageAppointments("Admin")).toBe(true);
  expect(canViewAllAppointments("Admin")).toBe(true);
  expect(canManageCalendarConfiguration("Admin")).toBe(true);
  expect(canDeleteClientDocuments("Admin")).toBe(true);
  expect(canDeleteClientAssessments("Admin")).toBe(true);
});

test("Staff sees full clinic data but cannot administer Admins or view System Log", () => {
  const capabilities = getCareTeamRoleCapabilities("Staff");
  expect(capabilities.canManageCareTeam).toBe(true);
  expect(capabilities.canManageAdminAccounts).toBe(false);
  expect(capabilities.canManageClientCategoriesAndBackups).toBe(true);
  expect(capabilities.canViewAuditLogs).toBe(false);
  expect(canUseAllRepresentativeAnalytics("Staff")).toBe(true);
  expect(canUseIndividualRepresentativeAnalytics("Staff")).toBe(true);
  expect(canCreateClientRecords("Staff")).toBe(true);
  expect(canEditClientClinicalRecords("Staff")).toBe(false);
  expect(canManageAppointments("Staff")).toBe(true);
  expect(canViewAllAppointments("Staff")).toBe(true);
  expect(canManageCalendarConfiguration("Staff")).toBe(false);
  expect(canManageClientDocuments("Staff")).toBe(true);
  expect(canManageClientAssessments("Staff")).toBe(true);
  expect(canDeleteClientDocuments("Staff")).toBe(false);
  expect(canDeleteClientAssessments("Staff")).toBe(false);
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
  expect(canManageAppointments(role)).toBe(false);
  expect(canManageOwnAvailability(role)).toBe(true);
  expect(canUpdateOwnAppointmentStatus(role)).toBe(true);
  expect(canDeleteClientDocuments(role)).toBe(true);
  expect(canDeleteClientAssessments(role)).toBe(true);
});

test("unknown roles fail closed", () => {
  expect(getProfileDisplayRole("Owner")).toBe("Unassigned");
  expect(canCreateClientRecords("Owner")).toBe(false);
  expect(canEditClientClinicalRecords("Owner")).toBe(false);
  expect(canUseAllRepresentativeAnalytics("Owner")).toBe(false);
  expect(canManageAppointments("Owner")).toBe(false);
  expect(canManageOwnAvailability("Owner")).toBe(false);
});
