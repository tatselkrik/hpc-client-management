import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type {
  ClientListItem,
  ClientTab,
  DashboardAnnouncement,
  Profile,
  AuthenticatorAssuranceState,
} from "../../appShared";
import {
  clearPasswordRecoveryHash,
  emptyDashboardAnnouncement,
  isLikelyEmailAddress,
} from "../../appShared";
import {
  getFriendlyAuthErrorMessage,
  getPasswordRecoveryValidationMessage,
} from "./authValidation";
import { CLINICAL_IDLE_LOCK_MINUTES } from "../security/useIdleSessionLock";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseAuthSessionActionsOptions = {
  email: string;
  password: string;
  recoveryPassword: string;
  recoveryPasswordConfirm: string;
  mfaChallengeCodeInput: string;
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
  writeAuditLog: WriteAuditLog;
  setStatus: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setIsAuthGateChecking: (checking: boolean) => void;
  setUserEmail: (email: string | null) => void;
  setShowMfaChallengeScreen: (show: boolean) => void;
  setMfaChallengeCodeInput: (code: string) => void;
  setMfaChallengeMessage: (message: string) => void;
  setIsMfaChallengeSubmitting: (submitting: boolean) => void;
  setMfaAssurance: Dispatch<SetStateAction<AuthenticatorAssuranceState>>;
  setPasswordRecoveryMessage: (message: string) => void;
  setIsPasswordRecoverySubmitting: (submitting: boolean) => void;
  isInvitationPasswordSetup: boolean;
  setIsInvitationPasswordSetup: (isInvitation: boolean) => void;
  setShowPasswordRecoveryScreen: (show: boolean) => void;
  setRecoveryPassword: (password: string) => void;
  setRecoveryPasswordConfirm: (password: string) => void;
  setClients: Dispatch<SetStateAction<ClientListItem[]>>;
  setSelectedClientId: (clientId: string) => void;
  setActiveClientTab: (tab: ClientTab) => void;
  setSelectedDocumentId: (documentId: string) => void;
  setSelectedAssessmentId: (assessmentId: string) => void;
  setDocumentPreviewUrl: (url: string) => void;
  setAssessmentPreviewUrl: (url: string) => void;
  setDashboardAnnouncement: Dispatch<SetStateAction<DashboardAnnouncement>>;
  setDashboardAnnouncementStatus: (message: string) => void;
  setPassword: (password: string) => void;
  setIsLoginCapsLockOn: (isOn: boolean) => void;
  setIsRecoveryCapsLockOn: (isOn: boolean) => void;
};

export function useAuthSessionActions({
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
  isInvitationPasswordSetup,
  setIsInvitationPasswordSetup,
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
}: UseAuthSessionActionsOptions) {
  const evaluateMfaChallengeRequirement = useCallback(async (): Promise<"challenge" | "verified" | "error"> => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      setMfaChallengeMessage(feedbackMessages.error("We could not complete the security check.", getFriendlyAuthErrorMessage(error)));
      setShowMfaChallengeScreen(false);
      return "error";
    }

    setMfaAssurance({
      currentLevel: data.currentLevel ?? null,
      nextLevel: data.nextLevel ?? null,
    });

    const requiresChallenge =
      data.nextLevel === "aal2" && data.currentLevel !== "aal2";

    setShowMfaChallengeScreen(requiresChallenge);

    if (requiresChallenge) {
      setMfaChallengeMessage("Enter the 6-digit code from your authenticator app to finish signing in.");
      return "challenge";
    }

    setMfaChallengeMessage("");
    setMfaChallengeCodeInput("");
    return "verified";
  }, [
    setMfaAssurance,
    setMfaChallengeCodeInput,
    setMfaChallengeMessage,
    setShowMfaChallengeScreen,
  ]);

  const refreshAuthenticatedAppData = useCallback(async () => {
    const profileLoaded = await loadProfile();

    if (!profileLoaded) {
      return false;
    }

    await loadMfaState();

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assurance.error || assurance.data.currentLevel !== "aal2") {
      return true;
    }

    await loadClients();
    await loadDashboardAnnouncement();
    await loadCareTeamProfiles();
    await loadClientCategories();
    return true;
  }, [
    loadCareTeamProfiles,
    loadClientCategories,
    loadClients,
    loadDashboardAnnouncement,
    loadMfaState,
    loadProfile,
  ]);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();

    if (!isLikelyEmailAddress(trimmedEmail)) {
      setStatus("Enter a valid email address.");
      return;
    }

    if (password.trim() === "") {
      setStatus("Enter your password.");
      return;
    }

    setLoading(true);
    setStatus(feedbackMessages.loading("Signing in"));
    setShowMfaChallengeScreen(false);
    setMfaChallengeCodeInput("");
    setMfaChallengeMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setStatus(feedbackMessages.error("We could not sign you in.", getFriendlyAuthErrorMessage(error)));
      setLoading(false);
      setIsAuthGateChecking(false);
      return;
    }

    setIsAuthGateChecking(true);
    setUserEmail(data.user?.email ?? null);

    const mfaStatus = await evaluateMfaChallengeRequirement();

    if (mfaStatus === "challenge") {
      setStatus("Enter your authenticator code to continue.");
      setLoading(false);
      setIsAuthGateChecking(false);
      return;
    }

    if (mfaStatus === "error") {
      await supabase.auth.signOut();
      setUserEmail(null);
      setStatus("Security check failed. Please sign in again.");
      setLoading(false);
      setIsAuthGateChecking(false);
      return;
    }

    const appLoaded = await refreshAuthenticatedAppData();

    if (!appLoaded) {
      setLoading(false);
      setIsAuthGateChecking(false);
      return;
    }

    await writeAuditLog("Auth", "Signed In", "session", data.user?.id ?? null, "Email sign-in", {
      summary: "Signed in with email and password.",
    });
    setStatus("Signed in.");
    setLoading(false);
    setIsAuthGateChecking(false);
  }, [
    email,
    evaluateMfaChallengeRequirement,
    password,
    refreshAuthenticatedAppData,
    setIsAuthGateChecking,
    setLoading,
    setMfaChallengeCodeInput,
    setMfaChallengeMessage,
    setShowMfaChallengeScreen,
    setStatus,
    setUserEmail,
    writeAuditLog,
  ]);

  const handleForgotPassword = useCallback(async () => {
    setStatus("Password recovery is not available yet. It will be enabled once the clinic website is available.");
  }, [setStatus]);

  const handleCompletePasswordRecovery = useCallback(async () => {
    const validationMessage = getPasswordRecoveryValidationMessage(
      recoveryPassword,
      recoveryPasswordConfirm
    );

    if (validationMessage) {
      setPasswordRecoveryMessage(validationMessage);
      return;
    }

    setIsPasswordRecoverySubmitting(true);
    setPasswordRecoveryMessage(feedbackMessages.loading("Updating password"));

    const { data, error } = await supabase.auth.updateUser({
      password: recoveryPassword,
    });

    if (error) {
      setPasswordRecoveryMessage(feedbackMessages.error("We could not update your password.", getFriendlyAuthErrorMessage(error)));
      setIsPasswordRecoverySubmitting(false);
      return;
    }

    await writeAuditLog(
      "Auth",
      isInvitationPasswordSetup ? "Invitation Password Set" : "Password Reset Completed",
      "session",
      data.user?.id ?? null,
      isInvitationPasswordSetup ? "Account invitation" : "Password recovery",
      {
        summary: isInvitationPasswordSetup
          ? "Set a password while accepting an account invitation."
          : "Completed password reset from recovery link.",
      }
    );

    setIsAuthGateChecking(true);
    setUserEmail(data.user?.email ?? userEmail ?? null);

    const mfaStatus = await evaluateMfaChallengeRequirement();

    if (mfaStatus === "challenge") {
      setPasswordRecoveryMessage("Password updated. Enter your authenticator code to continue.");
      setShowPasswordRecoveryScreen(false);
      setIsPasswordRecoverySubmitting(false);
      setIsAuthGateChecking(false);
      return;
    }

    if (mfaStatus === "error") {
      setPasswordRecoveryMessage("Password updated, but the security check failed. Please sign in again.");
      setIsPasswordRecoverySubmitting(false);
      setIsAuthGateChecking(false);
      return;
    }

    const appLoaded = await refreshAuthenticatedAppData();

    if (!appLoaded) {
      setIsPasswordRecoverySubmitting(false);
      setIsAuthGateChecking(false);
      return;
    }

    setRecoveryPassword("");
    setRecoveryPasswordConfirm("");
    setPasswordRecoveryMessage(feedbackMessages.updated("password"));
    setStatus(feedbackMessages.updated("password"));
    setShowPasswordRecoveryScreen(false);
    setIsInvitationPasswordSetup(false);
    clearPasswordRecoveryHash();
    setIsPasswordRecoverySubmitting(false);
    setIsAuthGateChecking(false);
  }, [
    evaluateMfaChallengeRequirement,
    isInvitationPasswordSetup,
    recoveryPassword,
    recoveryPasswordConfirm,
    refreshAuthenticatedAppData,
    setIsAuthGateChecking,
    setIsInvitationPasswordSetup,
    setIsPasswordRecoverySubmitting,
    setPasswordRecoveryMessage,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setShowPasswordRecoveryScreen,
    setStatus,
    setUserEmail,
    userEmail,
    writeAuditLog,
  ]);

  const handleLogout = useCallback(async (reason: "manual" | "idle" = "manual") => {
    const isIdleLock = reason === "idle";

    setLoading(true);

    await writeAuditLog(
      "Auth",
      isIdleLock ? "Idle Session Locked" : "Signed Out",
      "session",
      profile?.id ?? null,
      isIdleLock ? "Idle lock" : "Manual sign-out",
      {
        summary: isIdleLock
          ? "Session was locked after inactivity."
          : "Signed out from the clinic app.",
        idle_timeout_minutes: isIdleLock ? CLINICAL_IDLE_LOCK_MINUTES : undefined,
      }
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus(feedbackMessages.error("We could not sign you out.", error.message));
      setLoading(false);
      return;
    }

    clearAuthenticatedProfile();
    resetProfileAccountState();
    resetAuditLogs();
    resetMfaState();
    setClients([]);
    setSelectedClientId("");
    setActiveClientTab("overview");
    resetClientForm();
    clearProgressNotes();
    clearClientFiles();
    setSelectedDocumentId("");
    setDocumentPreviewUrl("");
    setSelectedAssessmentId("");
    setAssessmentPreviewUrl("");
    setDashboardAnnouncement(emptyDashboardAnnouncement());
    setDashboardAnnouncementStatus("");
    resetClientCategoryState();
    setPassword("");
    setIsLoginCapsLockOn(false);
    setShowPasswordRecoveryScreen(false);
    setIsInvitationPasswordSetup(false);
    setRecoveryPassword("");
    setRecoveryPasswordConfirm("");
    setIsRecoveryCapsLockOn(false);
    setPasswordRecoveryMessage("");
    setIsAuthGateChecking(false);
    clearPasswordRecoveryHash();
    setStatus(
      isIdleLock
        ? "Session locked after inactivity. Please sign in again."
        : "Signed out."
    );
    setLoading(false);
  }, [
    clearAuthenticatedProfile,
    clearClientFiles,
    clearProgressNotes,
    profile?.id,
    resetAuditLogs,
    resetClientCategoryState,
    resetClientForm,
    resetMfaState,
    resetProfileAccountState,
    setActiveClientTab,
    setAssessmentPreviewUrl,
    setClients,
    setDashboardAnnouncement,
    setDashboardAnnouncementStatus,
    setDocumentPreviewUrl,
    setIsAuthGateChecking,
    setIsLoginCapsLockOn,
    setIsInvitationPasswordSetup,
    setIsRecoveryCapsLockOn,
    setLoading,
    setPassword,
    setPasswordRecoveryMessage,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setSelectedAssessmentId,
    setSelectedClientId,
    setSelectedDocumentId,
    setShowPasswordRecoveryScreen,
    setStatus,
    writeAuditLog,
  ]);

  const handleCompleteMfaChallenge = useCallback(async () => {
    const code = mfaChallengeCodeInput.trim();

    if (!/^\d{6}$/.test(code)) {
      setMfaChallengeMessage("Enter your current 6-digit MFA code.");
      return;
    }

    setIsMfaChallengeSubmitting(true);
    setMfaChallengeMessage(feedbackMessages.loading("Verifying code"));

    const factors = await supabase.auth.mfa.listFactors();

    if (factors.error) {
      setMfaChallengeMessage(feedbackMessages.loadFailed("MFA devices", factors.error.message));
      setIsMfaChallengeSubmitting(false);
      return;
    }

    const verifiedFactor = [...(factors.data.totp ?? []), ...(factors.data.phone ?? [])].find(
      (factor) => factor.status === "verified"
    );

    if (!verifiedFactor) {
      setShowMfaChallengeScreen(false);
      setMfaChallengeMessage("");
      setIsMfaChallengeSubmitting(false);
      return;
    }

    const challenge = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (challenge.error) {
      setMfaChallengeMessage(feedbackMessages.error("We could not verify the code.", challenge.error.message));
      setIsMfaChallengeSubmitting(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challenge.data.id,
      code,
    });

    if (verify.error) {
      setMfaChallengeMessage(feedbackMessages.error("We could not verify the code.", verify.error.message));
      setIsMfaChallengeSubmitting(false);
      return;
    }

    setMfaChallengeMessage(feedbackMessages.loading("Loading your workspace"));
    setIsAuthGateChecking(true);

    await loadMfaState();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? userEmail ?? null);

    const appLoaded = await refreshAuthenticatedAppData();

    if (!appLoaded) {
      setIsMfaChallengeSubmitting(false);
      setIsAuthGateChecking(false);
      return;
    }

    await writeAuditLog(
      "Auth",
      "MFA Challenge Completed",
      "session",
      user?.id ?? null,
      "Authenticator verification",
      {
        summary: "Completed MFA challenge during sign-in.",
      }
    );
    await writeAuditLog("Auth", "Signed In", "session", user?.id ?? null, "Email sign-in", {
      summary: "Signed in with email, password, and MFA.",
    });

    setShowMfaChallengeScreen(false);
    setMfaChallengeCodeInput("");
    setMfaChallengeMessage("");
    setStatus("Signed in.");
    setIsMfaChallengeSubmitting(false);
    setIsAuthGateChecking(false);
  }, [
    loadMfaState,
    mfaChallengeCodeInput,
    refreshAuthenticatedAppData,
    setIsAuthGateChecking,
    setIsMfaChallengeSubmitting,
    setMfaChallengeCodeInput,
    setMfaChallengeMessage,
    setShowMfaChallengeScreen,
    setStatus,
    setUserEmail,
    userEmail,
    writeAuditLog,
  ]);

  return {
    evaluateMfaChallengeRequirement,
    refreshAuthenticatedAppData,
    handleLogin,
    handleForgotPassword,
    handleCompletePasswordRecovery,
    handleLogout,
    handleCompleteMfaChallenge,
  };
}
