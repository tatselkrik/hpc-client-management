import type { Dispatch, SetStateAction } from "react";

import type {
  Profile,
  Section,
} from "../../appShared";
import type { AboutSectionProps } from "../about/AboutSection";
import type { AuthFlowController } from "../auth/useAuthFlowController";
import type { CareTeamManagementController } from "../care-team/useCareTeamManagement";
import type { ClientWorkspaceController } from "../clients/useClientWorkspaceController";
import type { CalendarController } from "../calendar/useCalendarController";
import type { DashboardSectionProps } from "../dashboard/DashboardSection";
import type { ProfileSectionProps } from "../profile/ProfileSection";
import type { SettingsController } from "../settings/useSettingsController";
import type { AppRootRendererProps } from "./AppRootRenderer";

type UseAppRootPropsOptions = {
  activeSection: Section;
  setActiveSection: Dispatch<SetStateAction<Section>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  loading: boolean;
  profile: Profile | null;
  profileAvatarUrl: string;
  userEmail: string | null;
  authFlow: AuthFlowController;
  dashboardProps: DashboardSectionProps;
  clientWorkspace: ClientWorkspaceController;
  calendar: CalendarController;
  careTeam: CareTeamManagementController;
  canManageCareTeam: boolean;
  canManageAdminAccounts: boolean;
  profileProps: ProfileSectionProps;
  settingsController: SettingsController;
  aboutProps: AboutSectionProps;
};

export function useAppRootProps({
  activeSection,
  setActiveSection,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  loading,
  profile,
  profileAvatarUrl,
  userEmail,
  authFlow,
  dashboardProps,
  clientWorkspace,
  calendar,
  careTeam,
  canManageCareTeam,
  canManageAdminAccounts,
  profileProps,
  settingsController,
  aboutProps,
}: UseAppRootPropsOptions): AppRootRendererProps {
  const clientsProps = clientWorkspace.getClientsProps({
    loading,
    hpcRepresentativeOptions: careTeam.hpcRepresentativeOptions,
  });

  return {
    showPasswordRecoveryScreen: authFlow.showPasswordRecoveryScreen,
    isAuthGateChecking: authFlow.isAuthGateChecking,
    showMfaChallengeScreen: authFlow.showMfaChallengeScreen,
    passwordRecoveryProps: authFlow.passwordRecoveryProps,
    mfaChallengeProps: authFlow.mfaChallengeProps,
    loginProps: authFlow.loginProps,
    activeSection,
    dashboardProps,
    clientsProps,
    calendarProps: calendar,
    analyticsProps: {
      viewModel: clientWorkspace.analyticsViewModel,
    },
    careTeamProps: {
      careTeamMembers: careTeam.careTeamMembers,
      careTeamStatus: careTeam.careTeamStatus,
      profile,
      canManageCareTeam,
      canManageAdminAccounts,
      careTeamSavingId: careTeam.careTeamSavingId,
      careTeamSavingAction: careTeam.careTeamSavingAction,
      handleUpdateCareTeamRole: careTeam.handleUpdateCareTeamRole,
      handleRemoveCareTeamMember: careTeam.handleRemoveCareTeamMember,
      careTeamInviteForm: careTeam.careTeamInviteForm,
      setCareTeamInviteForm: careTeam.setCareTeamInviteForm,
      hpcRepresentativeOptions: careTeam.careTeamHpcRepresentativeOptions,
      isInvitingCareTeam: careTeam.isInvitingCareTeam,
      handleAddCareTeamMember: careTeam.handleAddCareTeamMember,
    },
    profileProps,
    settingsProps: {
      ...settingsController.settingsPropsBase,
      ...clientWorkspace.clientCategorySettingsProps,
    },
    aboutProps,
    isSidebarCollapsed,
    loading,
    profile,
    profileAvatarUrl,
    userEmail: userEmail ?? "",
    selectedClientName: clientWorkspace.selectedClient?.client_name ?? null,
    fileRenameTarget: clientWorkspace.fileRenameTarget,
    fileRenameInput: clientWorkspace.fileRenameInput,
    fileDeleteTarget: clientWorkspace.fileDeleteTarget,
    isPhoneUploadModalOpen: clientWorkspace.isPhoneUploadModalOpen,
    phoneUploadTarget: clientWorkspace.phoneUploadTarget,
    phoneUploadSession: clientWorkspace.phoneUploadSession,
    isCreatingPhoneUploadSession: clientWorkspace.isCreatingPhoneUploadSession,
    phoneUploadStatusMessage: clientWorkspace.phoneUploadStatusMessage,
    phoneUploadQrCodeUrl: clientWorkspace.phoneUploadQrCodeUrl,
    phoneUploadCopied: clientWorkspace.phoneUploadCopied,
    phoneUploadNow: clientWorkspace.phoneUploadNow,
    setActiveSection,
    setIsSidebarCollapsed,
    setFileRenameInput: clientWorkspace.setFileRenameInput,
    handleCloseFileRenameModal: clientWorkspace.handleCloseFileRenameModal,
    handleConfirmFileRename: clientWorkspace.handleConfirmFileRename,
    handleCloseFileDeleteModal: clientWorkspace.handleCloseFileDeleteModal,
    handleConfirmFileDelete: clientWorkspace.handleConfirmFileDelete,
    handleClosePhoneUpload: clientWorkspace.handleClosePhoneUpload,
    handleCopyPhoneUploadLink: clientWorkspace.handleCopyPhoneUploadLink,
    handleRefreshPhoneUpload: clientWorkspace.handleRefreshPhoneUpload,
    handleLogout: authFlow.handleLogout,
  };
}
