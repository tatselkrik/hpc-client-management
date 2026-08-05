import { useEffect, type Dispatch, type SetStateAction } from "react";

import type {
  Profile,
  Section,
  WriteAuditLog,
} from "../../appShared";
import { useAuthenticatedProfileBootstrap } from "../auth/useAuthenticatedProfileBootstrap";
import type { ProfileSectionProps } from "./ProfileSection";
import { useProfileAccountActions } from "./useProfileAccountActions";
import { useProfileAccountState } from "./useProfileAccountState";
import { useProfileMfaState } from "./useProfileMfaState";

type UseProfileControllerOptions = {
  activeSection: Section;
  setStatus: Dispatch<SetStateAction<string>>;
  refreshAuthenticatedAppData: () => Promise<boolean>;
  evaluateMfaChallengeRequirement: () => Promise<"verified" | "challenge" | "error">;
  writeAuditLog: WriteAuditLog;
};

export function useProfileController({
  activeSection,
  setStatus,
  refreshAuthenticatedAppData,
  evaluateMfaChallengeRequirement,
  writeAuditLog,
}: UseProfileControllerOptions) {
  const accountState = useProfileAccountState();
  const {
    profileNameInput,
    setProfileNameInput,
    profileMessage,
    setProfileMessage,
    profileEmailInput,
    setProfileEmailInput,
    profileCurrentPasswordInput,
    setProfileCurrentPasswordInput,
    profileEmailMessage,
    setProfileEmailMessage,
    profilePasswordCurrentInput,
    setProfilePasswordCurrentInput,
    profilePasswordNewInput,
    setProfilePasswordNewInput,
    profilePasswordConfirmInput,
    setProfilePasswordConfirmInput,
    profilePasswordMessage,
    setProfilePasswordMessage,
    profileEmailMfaCodeInput,
    setProfileEmailMfaCodeInput,
    profilePasswordMfaCodeInput,
    setProfilePasswordMfaCodeInput,
    profilePictureMessage,
    setProfilePictureMessage,
    isProfileSavingName,
    setIsProfileSavingName,
    isProfileSavingEmail,
    setIsProfileSavingEmail,
    isProfileSavingPassword,
    setIsProfileSavingPassword,
    isProfileSavingPicture,
    setIsProfileSavingPicture,
    profilePictureInputRef,
    resetProfileAccountState,
  } = accountState;

  const {
    userEmail,
    setUserEmail,
    profile,
    profileAvatarUrl,
    loadProfile,
    clearAuthenticatedProfile,
  } = useAuthenticatedProfileBootstrap({
    setStatus,
    setProfileNameInput,
    setProfileEmailInput,
  });

  const mfaState = useProfileMfaState();
  const {
    mfaFactors,
    mfaAssurance,
    setMfaAssurance,
    mfaMessage,
    setMfaMessage,
    mfaFriendlyNameInput,
    setMfaFriendlyNameInput,
    mfaEnrollment,
    setMfaEnrollment,
    mfaVerificationCodeInput,
    setMfaVerificationCodeInput,
    isMfaWorking,
    setIsMfaWorking,
    showMfaChallengeScreen,
    setShowMfaChallengeScreen,
    mfaChallengeCodeInput,
    setMfaChallengeCodeInput,
    mfaChallengeMessage,
    setMfaChallengeMessage,
    isMfaChallengeSubmitting,
    setIsMfaChallengeSubmitting,
    loadMfaState,
    resetMfaState,
    hasVerifiedMfaForProfileChanges,
    confirmMfaForSensitiveProfileChange,
  } = mfaState;

  useEffect(() => {
    if (!userEmail || activeSection !== "profile") {
      return;
    }

    void loadMfaState();
  }, [activeSection, loadMfaState, userEmail]);

  const profileActions = useProfileAccountActions({
    profile,
    userEmail,
    setStatus,
    loadProfile,
    refreshAuthenticatedAppData,
    evaluateMfaChallengeRequirement,
    writeAuditLog,
    profileNameInput,
    setProfileMessage,
    profileEmailInput,
    profileCurrentPasswordInput,
    setProfileCurrentPasswordInput,
    setProfileEmailMessage,
    profilePasswordCurrentInput,
    setProfilePasswordCurrentInput,
    profilePasswordNewInput,
    setProfilePasswordNewInput,
    profilePasswordConfirmInput,
    setProfilePasswordConfirmInput,
    setProfilePasswordMessage,
    profileEmailMfaCodeInput,
    setProfileEmailMfaCodeInput,
    profilePasswordMfaCodeInput,
    setProfilePasswordMfaCodeInput,
    setProfilePictureMessage,
    setIsProfileSavingName,
    setIsProfileSavingEmail,
    setIsProfileSavingPassword,
    setIsProfileSavingPicture,
    mfaFactors,
    mfaAssurance,
    mfaFriendlyNameInput,
    mfaEnrollment,
    setMfaEnrollment,
    mfaVerificationCodeInput,
    setMfaVerificationCodeInput,
    setIsMfaWorking,
    setMfaMessage,
    loadMfaState,
    hasVerifiedMfaForProfileChanges,
    confirmMfaForSensitiveProfileChange,
  });

  const profileProps: ProfileSectionProps = {
    profile,
    userEmail,
    profileAvatarUrl,
    profilePictureInputRef,
    handleProfilePictureSelected: profileActions.handleProfilePictureSelected,
    handleRemoveProfilePicture: profileActions.handleRemoveProfilePicture,
    isProfileSavingPicture,
    profilePictureMessage,
    profileNameInput,
    setProfileNameInput,
    handleProfileSave: profileActions.handleProfileSave,
    isProfileSavingName,
    profileMessage,
    profileEmailInput,
    setProfileEmailInput,
    profileCurrentPasswordInput,
    setProfileCurrentPasswordInput,
    profileEmailMfaCodeInput,
    setProfileEmailMfaCodeInput,
    handleProfileEmailChange: profileActions.handleProfileEmailChange,
    isProfileSavingEmail,
    profileEmailMessage,
    profilePasswordCurrentInput,
    setProfilePasswordCurrentInput,
    profilePasswordNewInput,
    setProfilePasswordNewInput,
    profilePasswordConfirmInput,
    setProfilePasswordConfirmInput,
    profilePasswordMfaCodeInput,
    setProfilePasswordMfaCodeInput,
    handleProfilePasswordChange: profileActions.handleProfilePasswordChange,
    isProfileSavingPassword,
    profilePasswordMessage,
    mfaAssurance,
    mfaFactors,
    mfaEnrollment,
    mfaVerificationCodeInput,
    setMfaVerificationCodeInput,
    handleVerifyMfaEnrollment: profileActions.handleVerifyMfaEnrollment,
    handleCancelMfaEnrollment: profileActions.handleCancelMfaEnrollment,
    isMfaWorking,
    mfaFriendlyNameInput,
    setMfaFriendlyNameInput,
    handleStartMfaEnrollment: profileActions.handleStartMfaEnrollment,
    handleRemoveMfaFactor: profileActions.handleRemoveMfaFactor,
    mfaMessage,
  };

  return {
    userEmail,
    setUserEmail,
    profile: profile as Profile | null,
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
  };
}

export type ProfileController = ReturnType<typeof useProfileController>;
