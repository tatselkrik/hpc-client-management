export const CARE_TEAM_ROLE_OPTIONS = [
  "Admin",
  "Psychologist / Counselor",
  "Staff",
];

export const isAdminRole = (value: string | null | undefined) =>
  ["admin", "ceo", "chief executive officer"].includes(
    (value ?? "").trim().toLowerCase()
  );

export const normalizeCareTeamRole = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();

  // Treat legacy CEO records as Admin until the security migration converts them.
  if (normalized === "ceo" || normalized === "chief executive officer") return "Admin";
  if (normalized.includes("admin")) return "Admin";
  if (
    normalized === "psychologist / counselor" ||
    normalized === "psychologist / counsellor" ||
    normalized === "psychologist" ||
    normalized === "counsellor" ||
    normalized === "counselor"
  ) {
    return "Psychologist / Counselor";
  }
  if (normalized.includes("intern")) return "Intern";
  if (normalized === "staff") return "Staff";
  return "";
};

export const isRepresentativeAssignedRole = (value: string | null | undefined) =>
  ["Admin", "Psychologist / Counselor"].includes(normalizeCareTeamRole(value));

export const hasHpcRepresentativeAssignment = (
  value: string | null | undefined
) => Boolean(value?.trim());

export const canUseAllRepresentativeAnalytics = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "Staff";
};

export const canUseIndividualRepresentativeAnalytics = (
  value: string | null | undefined
) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "Staff";
};

export const shouldDefaultAnalyticsToAssignedRepresentative = (
  value: string | null | undefined
) => normalizeCareTeamRole(value) === "Psychologist / Counselor";

export const canEditClientClinicalRecords = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "Psychologist / Counselor";
};

export const canCreateClientRecords = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "Psychologist / Counselor" || role === "Staff";
};

export const shouldLockClientRepresentativeToAssigned = (
  value: string | null | undefined
) => normalizeCareTeamRole(value) === "Psychologist / Counselor";

export const canEditClientCssrsInterview = (value: string | null | undefined) =>
  canEditClientClinicalRecords(value);

export const canEditClientCssrsProtectiveFactors = (
  value: string | null | undefined
) => canEditClientClinicalRecords(value);

export const canManageClientDocuments = (value: string | null | undefined) =>
  ["Admin", "Psychologist / Counselor", "Staff"].includes(
    normalizeCareTeamRole(value)
  );

export const canManageClientAssessments = (value: string | null | undefined) =>
  ["Admin", "Psychologist / Counselor", "Staff"].includes(
    normalizeCareTeamRole(value)
  );

export const canManageAppointments = (value: string | null | undefined) =>
  ["Admin", "Staff"].includes(normalizeCareTeamRole(value));

export const canViewAllAppointments = (value: string | null | undefined) =>
  canManageAppointments(value);

export const canManageCalendarConfiguration = (
  value: string | null | undefined
) => normalizeCareTeamRole(value) === "Admin";

export const canManageOwnAvailability = (value: string | null | undefined) =>
  normalizeCareTeamRole(value) === "Psychologist / Counselor";

export const canUpdateOwnAppointmentStatus = (
  value: string | null | undefined
) => normalizeCareTeamRole(value) === "Psychologist / Counselor";

export const canDeleteClientDocuments = (value: string | null | undefined) =>
  canEditClientClinicalRecords(value);

export const canDeleteClientAssessments = (value: string | null | undefined) =>
  canEditClientClinicalRecords(value);

export const getProfileDisplayRole = (value: string | null | undefined) =>
  normalizeCareTeamRole(value) || "Unassigned";

export const getCareTeamRoleCapabilities = (value: string | null | undefined) => {
  const role = getProfileDisplayRole(value);

  return {
    canManageCareTeam: role === "Admin" || role === "Staff",
    canManageAdminAccounts: role === "Admin",
    canManageClientCategoriesAndBackups: role === "Admin" || role === "Staff",
    canViewAuditLogs: role === "Admin",
    canManageDashboardAnnouncements:
      role === "Admin" || role === "Psychologist / Counselor" || role === "Staff",
    isClientAccessLimitedToAssignedRepresentative:
      role === "Psychologist / Counselor",
  };
};
