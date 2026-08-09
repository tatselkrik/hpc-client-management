import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import { AppRootRenderer } from "./features/app/AppRootRenderer";
import { useAppRootProps } from "./features/app/useAppRootProps";
import { useAboutUpdates } from "./features/about/useAboutUpdates";
import { useAuthFlowController, type AuthSessionActionsBridge } from "./features/auth/useAuthFlowController";
import { useDesktopAuthDeepLinks } from "./features/auth/useDesktopAuthDeepLinks";
import { useCurrentUserPermissions } from "./features/auth/useCurrentUserPermissions";
import { useAuditWriter } from "./features/audit/useAuditWriter";
import { useClientWorkspaceController } from "./features/clients/useClientWorkspaceController";
import { useCareTeamManagement } from "./features/care-team/useCareTeamManagement";
import { useDashboardController } from "./features/dashboard/useDashboardController";
import { useProfileController } from "./features/profile/useProfileController";
import { useSettingsController } from "./features/settings/useSettingsController";
import type {
  IntakeMonthRange,
  IntakeTimelineGrouping,
  IntakeYearRange,
  Section,
  WriteAuditLog,
} from "./appShared";
import {
  APP_PRODUCT_NAME,
} from "./appShared";

function App() {
  useDesktopAuthDeepLinks();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginCapsLockOn, setIsLoginCapsLockOn] = useState(false);
  const [status, setStatus] = useState("Please sign in.");
  const [loading, setLoading] = useState(false);
  const [isAuthGateChecking, setIsAuthGateChecking] = useState(true);
  const [showPasswordRecoveryScreen, setShowPasswordRecoveryScreen] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [isRecoveryCapsLockOn, setIsRecoveryCapsLockOn] = useState(false);
  const [passwordRecoveryMessage, setPasswordRecoveryMessage] = useState("");
  const [isPasswordRecoverySubmitting, setIsPasswordRecoverySubmitting] = useState(false);
  const [isInvitationPasswordSetup, setIsInvitationPasswordSetup] = useState(false);

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [intakeTimelineGrouping, setIntakeTimelineGrouping] =
    useState<IntakeTimelineGrouping>("month");
  const [intakeMonthRange, setIntakeMonthRange] = useState<IntakeMonthRange>("12M");
  const [intakeYearRange, setIntakeYearRange] = useState<IntakeYearRange>("5Y");

  const auditWriterRef = useRef<WriteAuditLog | null>(null);
  const authSessionActionsRef = useRef<AuthSessionActionsBridge | null>(null);

  useEffect(() => {
    document.title = APP_PRODUCT_NAME;
  }, []);

  const writeAuditLog = useCallback<WriteAuditLog>(async (
    module,
    action,
    targetType,
    targetId,
    targetLabel,
    details = {}
  ) => {
    if (!auditWriterRef.current) return;

    await auditWriterRef.current(
      module,
      action,
      targetType,
      targetId,
      targetLabel,
      details
    );
  }, []);

  const evaluateMfaChallengeRequirementForProfile = useCallback(async () => {
    if (!authSessionActionsRef.current) return "error";

    return authSessionActionsRef.current.evaluateMfaChallengeRequirement();
  }, []);

  const refreshAuthenticatedAppDataForProfile = useCallback(async () => {
    if (!authSessionActionsRef.current) return false;

    return authSessionActionsRef.current.refreshAuthenticatedAppData();
  }, []);

  const handleSessionActionsChange = useCallback((actions: AuthSessionActionsBridge) => {
    authSessionActionsRef.current = actions;
  }, []);

  const profileController = useProfileController({
    activeSection,
    setStatus,
    refreshAuthenticatedAppData: refreshAuthenticatedAppDataForProfile,
    evaluateMfaChallengeRequirement: evaluateMfaChallengeRequirementForProfile,
    writeAuditLog,
  });
  const {
    userEmail,
    setUserEmail,
    profile,
    profileAvatarUrl,
    loadProfile,
    clearAuthenticatedProfile,
    resetProfileAccountState,
    loadMfaState,
    resetMfaState,
    setMfaAssurance,
    showMfaChallengeScreen,
    setShowMfaChallengeScreen,
    mfaChallengeCodeInput,
    setMfaChallengeCodeInput,
    mfaChallengeMessage,
    setMfaChallengeMessage,
    isMfaChallengeSubmitting,
    setIsMfaChallengeSubmitting,
    profileProps,
  } = profileController;

  const permissions = useCurrentUserPermissions(profile);
  const {
    profileDisplayRole,
    canManageCareTeam,
    canManageAdminAccounts,
    canManageClientCategoriesAndBackups,
    canViewAuditLogs,
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
    canDeleteClientDocumentsForProfile,
    canDeleteClientAssessmentsForProfile,
    canCurrentProfileAccessClient,
    canCurrentProfileUseClientInPrimaryAnalytics,
  } = permissions;

  const settingsController = useSettingsController({
    activeSection,
    canManageClientCategoriesAndBackups,
    canViewAuditLogs,
    canManageDashboardAnnouncements,
    profile,
    userEmail,
    loading,
    setLoading,
    writeAuditLog,
  });
  const {
    auditLogFilter,
    loadAuditLogs,
    resetAuditLogs,
    dashboardAnnouncement,
    setDashboardAnnouncement,
    setDashboardAnnouncementStatus,
    dismissedAnnouncementKey,
    loadDashboardAnnouncement,
    handleDismissDashboardAnnouncement,
  } = settingsController;

  const actualWriteAuditLog = useAuditWriter({
    activeSection,
    auditLogFilter,
    canManageCareTeam: canViewAuditLogs,
    loadAuditLogs,
  });

  useEffect(() => {
    auditWriterRef.current = actualWriteAuditLog;
  }, [actualWriteAuditLog]);

  const {
    aboutMessage,
    isCheckingForUpdates,
    availableUpdate,
    checkForUpdates,
    openAvailableUpdate,
  } = useAboutUpdates();

  const clientWorkspace = useClientWorkspaceController({
    activeSection,
    userEmail,
    profileDisplayRole,
    canManageCareTeam: canManageClientCategoriesAndBackups,
    canCreateClientRecords: canCreateClientRecordsForProfile,
    canEditClientClinicalRecords: canEditClientClinicalRecordsForProfile,
    shouldLockClientRepresentativeToAssigned: shouldLockClientRepresentativeToAssignedForProfile,
    canManageClientDocuments: canManageClientDocumentsForProfile,
    canManageClientAssessments: canManageClientAssessmentsForProfile,
    canDeleteClientDocuments: canDeleteClientDocumentsForProfile,
    canDeleteClientAssessments: canDeleteClientAssessmentsForProfile,
    canEditClientCssrsInterview: canEditClientCssrsInterviewForProfile,
    canEditClientCssrsProtectiveFactors: canEditClientCssrsProtectiveFactorsForProfile,
    canCurrentProfileAccessClient,
    canCurrentProfileUseClientInPrimaryAnalytics,
    shouldUseAllRepresentativeAnalyticsDataset,
    shouldDefaultAnalyticsRepresentativeToAssigned,
    assignedHpcRepresentativeName,
    canUseAllRepresentativeAnalyticsForProfile,
    canUseIndividualRepresentativeAnalyticsForProfile,
    intakeTimelineGrouping,
    setIntakeTimelineGrouping,
    intakeMonthRange,
    setIntakeMonthRange,
    intakeYearRange,
    setIntakeYearRange,
    setLoading,
    writeAuditLog,
  });

  const careTeamController = useCareTeamManagement({
    activeSection,
    userEmail,
    profile,
    canManageCareTeam,
    canManageAdminAccounts,
    auditLogFilter,
    loadAuditLogs,
  });

  const { dashboardProps } = useDashboardController({
    analyticsDashboardInputs: clientWorkspace.analyticsDashboardInputs,
    analyticsViewModel: clientWorkspace.analyticsViewModel,
    clients: clientWorkspace.clients,
    selectedClient: clientWorkspace.selectedClient,
    selectedClientId: clientWorkspace.selectedClientId,
    canCurrentProfileAccessClient,
    setSelectedClientId: clientWorkspace.setSelectedClientId,
    setActiveClientTab: clientWorkspace.setActiveClientTab,
    setActiveSection,
    setClientMessage: clientWorkspace.setClientMessage,
    dashboardAnnouncement,
    dismissedAnnouncementKey,
    handleDismissDashboardAnnouncement,
    clientMessage: clientWorkspace.clientMessage,
    notesMessage: clientWorkspace.notesMessage,
    documentsMessage: clientWorkspace.documentsMessage,
    assessmentsMessage: clientWorkspace.assessmentsMessage,
  });

  const authFlowController = useAuthFlowController({
    email,
    setEmail,
    password,
    setPassword,
    isLoginCapsLockOn,
    setIsLoginCapsLockOn,
    status,
    setStatus,
    loading,
    setLoading,
    isAuthGateChecking,
    setIsAuthGateChecking,
    showPasswordRecoveryScreen,
    setShowPasswordRecoveryScreen,
    recoveryPassword,
    setRecoveryPassword,
    recoveryPasswordConfirm,
    setRecoveryPasswordConfirm,
    isRecoveryCapsLockOn,
    setIsRecoveryCapsLockOn,
    passwordRecoveryMessage,
    setPasswordRecoveryMessage,
    isPasswordRecoverySubmitting,
    setIsPasswordRecoverySubmitting,
    isInvitationPasswordSetup,
    setIsInvitationPasswordSetup,
    userEmail,
    profile,
    loadProfile,
    clearAuthenticatedProfile,
    loadClients: clientWorkspace.loadClients,
    loadDashboardAnnouncement,
    loadCareTeamProfiles: careTeamController.loadCareTeamProfiles,
    loadClientCategories: clientWorkspace.loadClientCategories,
    loadMfaState,
    resetProfileAccountState,
    resetAuditLogs,
    resetMfaState,
    resetClientForm: clientWorkspace.resetClientForm,
    clearProgressNotes: clientWorkspace.clearProgressNotes,
    clearClientFiles: clientWorkspace.clearClientFiles,
    resetClientCategoryState: clientWorkspace.resetClientCategoryState,
    writeAuditLog,
    setUserEmail,
    showMfaChallengeScreen,
    setShowMfaChallengeScreen,
    mfaChallengeCodeInput,
    setMfaChallengeCodeInput,
    mfaChallengeMessage,
    setMfaChallengeMessage,
    isMfaChallengeSubmitting,
    setIsMfaChallengeSubmitting,
    setMfaAssurance,
    setClients: clientWorkspace.setClients,
    setSelectedClientId: clientWorkspace.setSelectedClientId,
    setActiveClientTab: clientWorkspace.setActiveClientTab,
    setSelectedDocumentId: clientWorkspace.setSelectedDocumentId,
    setSelectedAssessmentId: clientWorkspace.setSelectedAssessmentId,
    setDocumentPreviewUrl: clientWorkspace.setDocumentPreviewUrl,
    setAssessmentPreviewUrl: clientWorkspace.setAssessmentPreviewUrl,
    setDashboardAnnouncement,
    setDashboardAnnouncementStatus,
    onSessionActionsChange: handleSessionActionsChange,
  });

  const appRootProps = useAppRootProps({
    activeSection,
    setActiveSection,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    loading,
    profile,
    profileAvatarUrl,
    userEmail,
    authFlow: authFlowController,
    dashboardProps,
    clientWorkspace,
    careTeam: careTeamController,
    canManageCareTeam,
    canManageAdminAccounts,
    profileProps,
    settingsController,
    aboutProps: {
      aboutMessage,
      handleCheckForUpdates: checkForUpdates,
      availableUpdate,
      handleOpenAvailableUpdate: openAvailableUpdate,
      isCheckingForUpdates,
    },
  });

  return <AppRootRenderer {...appRootProps} />;
}

export default App;
