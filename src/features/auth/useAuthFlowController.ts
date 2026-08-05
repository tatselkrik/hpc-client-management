import { useEffect, type Dispatch, type SetStateAction } from "react";

import type {
  AuthenticatorAssuranceState,
  ClientListItem,
  ClientTab,
  DashboardAnnouncement,
  Profile,
} from "../../appShared";
import type { AppRootRendererProps } from "../app/AppRootRenderer";
import { useIdleSessionLock } from "../security/useIdleSessionLock";
import { useAuthGateBootstrap } from "./useAuthGateBootstrap";
import { useAuthSessionActions } from "./useAuthSessionActions";

export type AuthSessionActionsBridge = {
  evaluateMfaChallengeRequirement: () => Promise<"verified" | "challenge" | "error">;
  refreshAuthenticatedAppData: () => Promise<boolean>;
};

type UseAuthFlowControllerOptions = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  isLoginCapsLockOn: boolean;
  setIsLoginCapsLockOn: Dispatch<SetStateAction<boolean>>;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  isAuthGateChecking: boolean;
  setIsAuthGateChecking: Dispatch<SetStateAction<boolean>>;
  showPasswordRecoveryScreen: boolean;
  setShowPasswordRecoveryScreen: Dispatch<SetStateAction<boolean>>;
  recoveryPassword: string;
  setRecoveryPassword: Dispatch<SetStateAction<string>>;
  recoveryPasswordConfirm: string;
  setRecoveryPasswordConfirm: Dispatch<SetStateAction<string>>;
  isRecoveryCapsLockOn: boolean;
  setIsRecoveryCapsLockOn: Dispatch<SetStateAction<boolean>>;
  passwordRecoveryMessage: string;
  setPasswordRecoveryMessage: Dispatch<SetStateAction<string>>;
  isPasswordRecoverySubmitting: boolean;
  setIsPasswordRecoverySubmitting: Dispatch<SetStateAction<boolean>>;

  userEmail: string | null;
  profile: Profile | null;
  loadProfile: () => Promise<boolean>;
  clearAuthenticatedProfile: () => void;
  loadClients: () => Promise<void>;
  loadDashboardAnnouncement: () => Promise<void>;
  loadCareTeamProfiles: () => Promise<void>;
  loadClientCategories: () => Promise<void>;
  loadMfaState: () => Promise<void>;
  resetProfileAccountState: () => void;
  resetAuditLogs: () => void;
  resetMfaState: () => void;
  resetClientForm: () => void;
  clearProgressNotes: () => void;
  clearClientFiles: () => void;
  resetClientCategoryState: () => void;
  writeAuditLog: (
    module: string,
    action: string,
    targetType: string | null,
    targetId: string | null,
    targetLabel: string | null,
    details?: Record<string, unknown>
  ) => Promise<void>;
  setUserEmail: Dispatch<SetStateAction<string | null>>;
  showMfaChallengeScreen: boolean;
  setShowMfaChallengeScreen: Dispatch<SetStateAction<boolean>>;
  mfaChallengeCodeInput: string;
  setMfaChallengeCodeInput: Dispatch<SetStateAction<string>>;
  mfaChallengeMessage: string;
  setMfaChallengeMessage: Dispatch<SetStateAction<string>>;
  isMfaChallengeSubmitting: boolean;
  setIsMfaChallengeSubmitting: Dispatch<SetStateAction<boolean>>;
  setMfaAssurance: Dispatch<SetStateAction<AuthenticatorAssuranceState>>;
  setClients: Dispatch<SetStateAction<ClientListItem[]>>;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  setActiveClientTab: Dispatch<SetStateAction<ClientTab>>;
  setSelectedDocumentId: Dispatch<SetStateAction<string>>;
  setSelectedAssessmentId: Dispatch<SetStateAction<string>>;
  setDocumentPreviewUrl: Dispatch<SetStateAction<string>>;
  setAssessmentPreviewUrl: Dispatch<SetStateAction<string>>;
  setDashboardAnnouncement: Dispatch<SetStateAction<DashboardAnnouncement>>;
  setDashboardAnnouncementStatus: Dispatch<SetStateAction<string>>;
  onSessionActionsChange: (actions: AuthSessionActionsBridge) => void;
};

export function useAuthFlowController({
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
  userEmail,
  profile,
  loadProfile,
  clearAuthenticatedProfile,
  loadClients,
  loadDashboardAnnouncement,
  loadCareTeamProfiles,
  loadClientCategories,
  loadMfaState,
  resetProfileAccountState,
  resetAuditLogs,
  resetMfaState,
  resetClientForm,
  clearProgressNotes,
  clearClientFiles,
  resetClientCategoryState,
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
  setClients,
  setSelectedClientId,
  setActiveClientTab,
  setSelectedDocumentId,
  setSelectedAssessmentId,
  setDocumentPreviewUrl,
  setAssessmentPreviewUrl,
  setDashboardAnnouncement,
  setDashboardAnnouncementStatus,
  onSessionActionsChange,
}: UseAuthFlowControllerOptions) {
  const {
    evaluateMfaChallengeRequirement,
    refreshAuthenticatedAppData,
    handleLogin,
    handleForgotPassword,
    handleCompletePasswordRecovery,
    handleLogout,
    handleCompleteMfaChallenge,
  } = useAuthSessionActions({
    email,
    password,
    recoveryPassword,
    recoveryPasswordConfirm,
    mfaChallengeCodeInput,
    userEmail,
    profile,
    loadProfile,
    clearAuthenticatedProfile,
    loadClients,
    loadDashboardAnnouncement,
    loadCareTeamProfiles,
    loadClientCategories,
    loadMfaState,
    resetProfileAccountState,
    resetAuditLogs,
    resetMfaState,
    resetClientForm,
    clearProgressNotes,
    clearClientFiles,
    resetClientCategoryState,
    writeAuditLog,
    setStatus,
    setLoading,
    setIsAuthGateChecking,
    setUserEmail,
    setShowMfaChallengeScreen,
    setMfaChallengeCodeInput,
    setMfaChallengeMessage,
    setIsMfaChallengeSubmitting,
    setMfaAssurance,
    setPasswordRecoveryMessage,
    setIsPasswordRecoverySubmitting,
    setShowPasswordRecoveryScreen,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setClients,
    setSelectedClientId,
    setActiveClientTab,
    setSelectedDocumentId,
    setSelectedAssessmentId,
    setDocumentPreviewUrl,
    setAssessmentPreviewUrl,
    setDashboardAnnouncement,
    setDashboardAnnouncementStatus,
    setPassword,
    setIsLoginCapsLockOn,
    setIsRecoveryCapsLockOn,
  });

  useEffect(() => {
    onSessionActionsChange({
      evaluateMfaChallengeRequirement,
      refreshAuthenticatedAppData,
    });
  }, [
    evaluateMfaChallengeRequirement,
    onSessionActionsChange,
    refreshAuthenticatedAppData,
  ]);

  useAuthGateBootstrap({
    evaluateMfaChallengeRequirement,
    refreshAuthenticatedAppData,
    setDashboardAnnouncement,
    setIsAuthGateChecking,
    setPasswordRecoveryMessage,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setShowMfaChallengeScreen,
    setShowPasswordRecoveryScreen,
    setStatus,
    setUserEmail,
  });

  useIdleSessionLock({
    enabled:
      Boolean(userEmail) &&
      !isAuthGateChecking &&
      !showMfaChallengeScreen &&
      !showPasswordRecoveryScreen,
    onIdle: () => handleLogout("idle"),
  });

  const passwordRecoveryProps: AppRootRendererProps["passwordRecoveryProps"] = {
    recoveryPassword,
    recoveryPasswordConfirm,
    isPasswordRecoverySubmitting,
    isRecoveryCapsLockOn,
    loading,
    passwordRecoveryMessage,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setIsRecoveryCapsLockOn,
    handleCompletePasswordRecovery,
    handleLogout,
  };

  const mfaChallengeProps: AppRootRendererProps["mfaChallengeProps"] = {
    mfaChallengeCodeInput,
    isMfaChallengeSubmitting,
    isAuthGateChecking,
    loading,
    mfaChallengeMessage,
    setMfaChallengeCodeInput,
    handleCompleteMfaChallenge,
    handleLogout,
  };

  const loginProps: AppRootRendererProps["loginProps"] = {
    email,
    password,
    isLoginBusy: loading,
    loading,
    status,
    isLoginCapsLockOn,
    setEmail,
    setPassword,
    setIsLoginCapsLockOn,
    handleLogin,
    handleForgotPassword,
  };

  return {
    evaluateMfaChallengeRequirement,
    refreshAuthenticatedAppData,
    handleLogin,
    handleForgotPassword,
    handleCompletePasswordRecovery,
    handleLogout,
    handleCompleteMfaChallenge,
    showPasswordRecoveryScreen,
    isAuthGateChecking,
    showMfaChallengeScreen,
    passwordRecoveryProps,
    mfaChallengeProps,
    loginProps,
  };
}

export type AuthFlowController = ReturnType<typeof useAuthFlowController>;
