import { useCallback } from "react";

import type { Profile } from "../../appShared";
import {
  canCreateClientRecords,
  canEditClientClinicalRecords,
  canEditClientCssrsInterview,
  canEditClientCssrsProtectiveFactors,
  canManageClientAssessments,
  canManageClientDocuments,
  canUseAllRepresentativeAnalytics,
  canUseIndividualRepresentativeAnalytics,
  getProfileDisplayRole,
  normalizeHpcRepresentativeName,
  shouldDefaultAnalyticsToAssignedRepresentative,
  shouldLockClientRepresentativeToAssigned,
} from "../../appShared";

type ClientRepresentativeRecord = {
  hpc_representative?: string | null;
};

export function useCurrentUserPermissions(profile: Profile | null) {
  const profileDisplayRole = getProfileDisplayRole(profile?.role);
  const canManageCareTeam = profileDisplayRole === "Admin" || profileDisplayRole === "CEO";
  const canManageDashboardAnnouncements = canManageCareTeam || profileDisplayRole === "Staff";
  const assignedHpcRepresentativeName = normalizeHpcRepresentativeName(
    profile?.hpc_representative_name ?? ""
  );
  const isClientAccessLimitedToAssignedRepresentative =
    profileDisplayRole === "CEO" || profileDisplayRole === "Psychologist / Counselor";
  const isPrimaryAnalyticsLimitedToAssignedRepresentative =
    profileDisplayRole === "Psychologist / Counselor";
  const canUseAllRepresentativeAnalyticsForProfile =
    canUseAllRepresentativeAnalytics(profileDisplayRole);
  const canUseIndividualRepresentativeAnalyticsForProfile =
    canUseIndividualRepresentativeAnalytics(profileDisplayRole);
  const shouldDefaultAnalyticsRepresentativeToAssigned =
    shouldDefaultAnalyticsToAssignedRepresentative(profileDisplayRole);
  const shouldUseAllRepresentativeAnalyticsDataset =
    canUseAllRepresentativeAnalyticsForProfile;
  const canCreateClientRecordsForProfile =
    canCreateClientRecords(profileDisplayRole);
  const canEditClientClinicalRecordsForProfile =
    canEditClientClinicalRecords(profileDisplayRole);
  const shouldLockClientRepresentativeToAssignedForProfile =
    shouldLockClientRepresentativeToAssigned(profileDisplayRole);
  const canEditClientCssrsInterviewForProfile =
    canEditClientCssrsInterview(profileDisplayRole);
  const canEditClientCssrsProtectiveFactorsForProfile =
    canEditClientCssrsProtectiveFactors(profileDisplayRole);
  const canManageClientDocumentsForProfile =
    canManageClientDocuments(profileDisplayRole);
  const canManageClientAssessmentsForProfile =
    canManageClientAssessments(profileDisplayRole);

  const canCurrentProfileAccessClient = useCallback(
    (client: ClientRepresentativeRecord) => {
      if (!isClientAccessLimitedToAssignedRepresentative) return true;
      if (!assignedHpcRepresentativeName) return false;

      return (
        normalizeHpcRepresentativeName(client.hpc_representative ?? "").toLowerCase() ===
        assignedHpcRepresentativeName.toLowerCase()
      );
    },
    [assignedHpcRepresentativeName, isClientAccessLimitedToAssignedRepresentative]
  );

  const canCurrentProfileUseClientInPrimaryAnalytics = useCallback(
    (client: ClientRepresentativeRecord) => {
      if (!isPrimaryAnalyticsLimitedToAssignedRepresentative) return true;
      if (!assignedHpcRepresentativeName) return false;

      return (
        normalizeHpcRepresentativeName(client.hpc_representative ?? "").toLowerCase() ===
        assignedHpcRepresentativeName.toLowerCase()
      );
    },
    [assignedHpcRepresentativeName, isPrimaryAnalyticsLimitedToAssignedRepresentative]
  );

  return {
    profileDisplayRole,
    canManageCareTeam,
    canManageDashboardAnnouncements,
    assignedHpcRepresentativeName,
    canUseAllRepresentativeAnalyticsForProfile,
    canUseIndividualRepresentativeAnalyticsForProfile,
    shouldDefaultAnalyticsRepresentativeToAssigned,
    shouldUseAllRepresentativeAnalyticsDataset,
    canCreateClientRecordsForProfile,
    canEditClientClinicalRecordsForProfile,
    shouldLockClientRepresentativeToAssignedForProfile,
    canEditClientCssrsInterviewForProfile,
    canEditClientCssrsProtectiveFactorsForProfile,
    canManageClientDocumentsForProfile,
    canManageClientAssessmentsForProfile,
    canCurrentProfileAccessClient,
    canCurrentProfileUseClientInPrimaryAnalytics,
  };
}
