import type { ChangeEvent } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type {
  AuthenticatorAssuranceState,
  MfaEnrollment,
  MfaFactor,
  Profile,
} from "../../appShared";
import {
  DEFAULT_MFA_FRIENDLY_NAME,
  PROFILE_PICTURES_BUCKET,
  PROFILE_PICTURE_ALLOWED_MIME_TYPES,
  PROFILE_PICTURE_MAX_SOURCE_BYTES,
  buildProfileAvatarPath,
  formatFileSize,
  isLikelyEmailAddress,
  normalizeSvgDataUrl,
  summarizeMfaFactor,
} from "../../appShared";
import {
  createOptimizedProfilePicture,
  type PreparedProfilePicture,
} from "./profilePicture";
import { validateStoredUploadOnServer } from "../../lib/uploadValidation";
import { getProfilePasswordValidationMessage } from "./profileValidation";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseProfileAccountActionsOptions = {
  profile: Profile | null;
  userEmail: string | null;
  setStatus: (status: string) => void;
  loadProfile: () => Promise<boolean>;
  refreshAuthenticatedAppData: () => Promise<boolean>;
  evaluateMfaChallengeRequirement: () => Promise<"verified" | "challenge" | "error">;
  writeAuditLog: WriteAuditLog;

  profileNameInput: string;
  setProfileMessage: (message: string) => void;
  profileEmailInput: string;
  profileCurrentPasswordInput: string;
  setProfileCurrentPasswordInput: (value: string) => void;
  setProfileEmailMessage: (message: string) => void;
  profilePasswordCurrentInput: string;
  setProfilePasswordCurrentInput: (value: string) => void;
  profilePasswordNewInput: string;
  setProfilePasswordNewInput: (value: string) => void;
  profilePasswordConfirmInput: string;
  setProfilePasswordConfirmInput: (value: string) => void;
  setProfilePasswordMessage: (message: string) => void;
  profileEmailMfaCodeInput: string;
  setProfileEmailMfaCodeInput: (value: string) => void;
  profilePasswordMfaCodeInput: string;
  setProfilePasswordMfaCodeInput: (value: string) => void;
  setProfilePictureMessage: (message: string) => void;
  setIsProfileSavingName: (isSaving: boolean) => void;
  setIsProfileSavingEmail: (isSaving: boolean) => void;
  setIsProfileSavingPassword: (isSaving: boolean) => void;
  setIsProfileSavingPicture: (isSaving: boolean) => void;

  mfaFactors: MfaFactor[];
  mfaAssurance: AuthenticatorAssuranceState;
  mfaFriendlyNameInput: string;
  mfaEnrollment: MfaEnrollment | null;
  setMfaEnrollment: (enrollment: MfaEnrollment | null) => void;
  mfaVerificationCodeInput: string;
  setMfaVerificationCodeInput: (value: string) => void;
  setIsMfaWorking: (isWorking: boolean) => void;
  setMfaMessage: (message: string) => void;
  loadMfaState: () => Promise<void>;
  hasVerifiedMfaForProfileChanges: () => boolean;
  confirmMfaForSensitiveProfileChange: (
    codeInput: string,
    setMessage: (value: string) => void,
    actionLabel: string
  ) => Promise<boolean>;
};

export function useProfileAccountActions({
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
}: UseProfileAccountActionsOptions) {
  const handleProfileSave = async () => {
    if (!profile) return;

    const trimmedName = profileNameInput.trim();

    if (trimmedName === "") {
      setProfileMessage(feedbackMessages.required("full name"));
      return;
    }

    setIsProfileSavingName(true);
    setProfileMessage(feedbackMessages.loading("Saving name"));

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName })
      .eq("id", profile.id);

    if (error) {
      setProfileMessage(feedbackMessages.saveFailed("name", error.message));
      setIsProfileSavingName(false);
      return;
    }

    await loadProfile();
    await writeAuditLog("Profile", "Display Name Updated", "profile", profile.id, trimmedName, {
      previous_name: profile.full_name ?? "",
      new_name: trimmedName,
      summary: `Changed display name from "${profile.full_name ?? "Not set"}" to "${trimmedName}".`,
    });
    setProfileMessage(feedbackMessages.updated("name"));
    setIsProfileSavingName(false);
  };

  const handleProfileEmailChange = async () => {
    const trimmedEmail = profileEmailInput.trim();

    if (!userEmail) {
      setProfileEmailMessage("No signed-in email was found.");
      return;
    }

    if (!isLikelyEmailAddress(trimmedEmail)) {
      setProfileEmailMessage("Enter a valid email address.");
      return;
    }

    if (trimmedEmail.toLowerCase() === userEmail.toLowerCase()) {
      setProfileEmailMessage("Enter a different email address to continue.");
      return;
    }

    if (profileCurrentPasswordInput.trim() === "") {
      setProfileEmailMessage("Enter your current password to confirm the email change.");
      return;
    }

    if (hasVerifiedMfaForProfileChanges() && !/^\d{6}$/.test(profileEmailMfaCodeInput.trim())) {
      setProfileEmailMessage("Enter your current 6-digit MFA code to request the email change.");
      return;
    }

    setIsProfileSavingEmail(true);
    setProfileEmailMessage(feedbackMessages.loading("Confirming your current password"));

    const reauth = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: profileCurrentPasswordInput,
    });

    if (reauth.error) {
      setProfileEmailMessage(feedbackMessages.error("We could not confirm your current password.", reauth.error.message));
      setIsProfileSavingEmail(false);
      return;
    }

    const mfaConfirmed = await confirmMfaForSensitiveProfileChange(
      profileEmailMfaCodeInput,
      setProfileEmailMessage,
      "request the email change"
    );

    if (!mfaConfirmed) {
      setIsProfileSavingEmail(false);
      return;
    }

    setProfileEmailMessage(feedbackMessages.loading("Requesting email change"));

    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    if (error) {
      setProfileEmailMessage(feedbackMessages.error("We could not request the email change.", error.message));
      setIsProfileSavingEmail(false);
      return;
    }

    await loadMfaState();
    await evaluateMfaChallengeRequirement();
    await writeAuditLog("Profile", "Email Change Requested", "profile", profile?.id ?? null, trimmedEmail, {
      current_email: userEmail,
      requested_email: trimmedEmail,
      summary: `Requested a sign-in email change from ${userEmail} to ${trimmedEmail}.`,
    });
    setProfileCurrentPasswordInput("");
    setProfileEmailMfaCodeInput("");
    setProfileEmailMessage(
      "Email change requested. Check both your current and new email inboxes for confirmation links before using the new address."
    );
    setIsProfileSavingEmail(false);
  };

  const handleProfilePasswordChange = async () => {
    const currentPassword = profilePasswordCurrentInput;
    const nextPassword = profilePasswordNewInput;
    const confirmPassword = profilePasswordConfirmInput;

    if (!userEmail) {
      setProfilePasswordMessage("No signed-in email was found.");
      return;
    }

    const validationMessage = getProfilePasswordValidationMessage(
      currentPassword,
      nextPassword,
      confirmPassword
    );

    if (validationMessage) {
      setProfilePasswordMessage(validationMessage);
      return;
    }

    if (hasVerifiedMfaForProfileChanges() && !/^\d{6}$/.test(profilePasswordMfaCodeInput.trim())) {
      setProfilePasswordMessage("Enter your current 6-digit MFA code to update your password.");
      return;
    }

    setIsProfileSavingPassword(true);
    setProfilePasswordMessage(feedbackMessages.loading("Confirming your current password"));

    const reauth = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (reauth.error) {
      setProfilePasswordMessage(feedbackMessages.error("We could not confirm your current password.", reauth.error.message));
      setIsProfileSavingPassword(false);
      return;
    }

    const mfaConfirmed = await confirmMfaForSensitiveProfileChange(
      profilePasswordMfaCodeInput,
      setProfilePasswordMessage,
      "update your password"
    );

    if (!mfaConfirmed) {
      setIsProfileSavingPassword(false);
      return;
    }

    setProfilePasswordMessage(feedbackMessages.loading("Updating password"));

    const { data, error } = await supabase.auth.updateUser({
      password: nextPassword,
    });

    if (error) {
      setProfilePasswordMessage(feedbackMessages.error("We could not update your password.", error.message));
      setIsProfileSavingPassword(false);
      return;
    }

    setProfilePasswordCurrentInput("");
    setProfilePasswordNewInput("");
    setProfilePasswordConfirmInput("");
    setProfilePasswordMfaCodeInput("");
    setProfilePasswordMessage(feedbackMessages.updated("password"));
    setStatus(feedbackMessages.updated("password"));
    await refreshAuthenticatedAppData();
    await evaluateMfaChallengeRequirement();
    await writeAuditLog(
      "Profile",
      "Password Changed",
      "profile",
      data.user?.id ?? profile?.id ?? null,
      "Password change",
      {
        summary: "Changed the account password from the Profile page.",
        changed_from: "Profile page",
      }
    );
    setIsProfileSavingPassword(false);
  };

  const handleProfilePictureSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    if (!(PROFILE_PICTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(selectedFile.type)) {
      setProfilePictureMessage("Select a JPG, PNG, or WebP image for the profile picture.");
      return;
    }

    if (selectedFile.size > PROFILE_PICTURE_MAX_SOURCE_BYTES) {
      setProfilePictureMessage(
        `Choose an image smaller than ${formatFileSize(PROFILE_PICTURE_MAX_SOURCE_BYTES)}.`
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfilePictureMessage(userError?.message ?? "No signed-in user found.");
      return;
    }

    setIsProfileSavingPicture(true);
    setProfilePictureMessage(feedbackMessages.loading("Optimizing profile picture"));

    let preparedPicture: PreparedProfilePicture;

    try {
      preparedPicture = await createOptimizedProfilePicture(selectedFile);
    } catch (error) {
      setProfilePictureMessage(
        getErrorDetail(error, "Unable to optimize the selected image.")
      );
      setIsProfileSavingPicture(false);
      return;
    }

    const nextAvatarPath = buildProfileAvatarPath(user.id, preparedPicture.file.name);
    const previousAvatarPath = profile?.avatar_path?.trim() ?? "";

    setProfilePictureMessage(feedbackMessages.loading("Uploading profile picture"));

    const uploadResult = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(nextAvatarPath, preparedPicture.file, {
        contentType: preparedPicture.file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      setProfilePictureMessage(feedbackMessages.uploadFailed("profile picture", uploadResult.error.message));
      setIsProfileSavingPicture(false);
      return;
    }

    const serverValidation = await validateStoredUploadOnServer({
      context: "profile_picture",
      bucket: PROFILE_PICTURES_BUCKET,
      storage_path: nextAvatarPath,
      file_name: preparedPicture.file.name,
      mime_type: preparedPicture.file.type || null,
      file_size_bytes: preparedPicture.file.size,
    });

    if (!serverValidation.ok) {
      await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([nextAvatarPath]);
      setProfilePictureMessage(
        feedbackMessages.error(
          "We could not accept this profile picture.",
          serverValidation.message
        )
      );
      setIsProfileSavingPicture(false);
      return;
    }

    setProfilePictureMessage(feedbackMessages.loading("Saving profile picture"));

    const profileUpdate = await supabase
      .from("profiles")
      .update({ avatar_path: nextAvatarPath })
      .eq("id", user.id);

    if (profileUpdate.error) {
      await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([nextAvatarPath]);
      setProfilePictureMessage(feedbackMessages.saveFailed("profile picture", profileUpdate.error.message));
      setIsProfileSavingPicture(false);
      return;
    }

    if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) {
      await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([previousAvatarPath]);
    }

    await loadProfile();
    await writeAuditLog("Profile", "Profile Picture Updated", "profile", user.id, "Profile picture", {
      summary: "Uploaded and optimized a new profile picture.",
      original_file_name: selectedFile.name,
      original_size: formatFileSize(preparedPicture.originalSize),
      uploaded_size: formatFileSize(preparedPicture.uploadedSize),
      width: preparedPicture.width,
      height: preparedPicture.height,
      optimized: preparedPicture.wasOptimized,
    });
    setProfilePictureMessage(
      `Profile picture updated. Optimized to ${formatFileSize(
        preparedPicture.uploadedSize
      )}.`
    );
    setIsProfileSavingPicture(false);
  };

  const handleRemoveProfilePicture = async () => {
    const currentAvatarPath = profile?.avatar_path?.trim() ?? "";

    if (!currentAvatarPath) {
      setProfilePictureMessage("No profile picture is currently saved.");
      return;
    }

    setIsProfileSavingPicture(true);
    setProfilePictureMessage(feedbackMessages.loading("Removing profile picture"));

    const profileUpdate = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", profile?.id ?? "");

    if (profileUpdate.error) {
      setProfilePictureMessage(feedbackMessages.error("We could not remove the profile picture.", profileUpdate.error.message));
      setIsProfileSavingPicture(false);
      return;
    }

    const removeResult = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .remove([currentAvatarPath]);

    await loadProfile();
    await writeAuditLog(
      "Profile",
      "Profile Picture Removed",
      "profile",
      profile?.id ?? null,
      "Profile picture",
      {
        summary: "Removed the current profile picture.",
        removed_path: currentAvatarPath,
      }
    );

    if (removeResult.error) {
      setProfilePictureMessage(
        `Profile picture removed from your profile. Stored file cleanup could not be completed. ${removeResult.error.message}`
      );
    } else {
      setProfilePictureMessage("Profile picture removed.");
    }

    setIsProfileSavingPicture(false);
  };

  const handleStartMfaEnrollment = async () => {
    const friendlyName = mfaFriendlyNameInput.trim() || DEFAULT_MFA_FRIENDLY_NAME;
    const existingEnrollment = mfaEnrollment;

    setIsMfaWorking(true);
    setMfaMessage(
      existingEnrollment
        ? "Regenerating authenticator setup..."
        : "Preparing authenticator setup..."
    );
    setMfaEnrollment(null);
    setMfaVerificationCodeInput("");

    if (existingEnrollment) {
      const cleanup = await supabase.auth.mfa.unenroll({
        factorId: existingEnrollment.factorId,
      });

      if (cleanup.error) {
        setMfaMessage(feedbackMessages.error("We could not regenerate authenticator setup.", cleanup.error.message));
        setIsMfaWorking(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });

    if (error) {
      setMfaMessage(feedbackMessages.error("We could not start authenticator setup.", error.message));
      setIsMfaWorking(false);
      return;
    }

    setMfaEnrollment({
      factorId: data.id,
      qrCode: normalizeSvgDataUrl(data.totp.qr_code),
      secret: data.totp.secret,
      uri: data.totp.uri ?? "",
      friendlyName: data.friendly_name ?? friendlyName,
    });
    await writeAuditLog(
      "Profile",
      existingEnrollment ? "MFA Setup Regenerated" : "MFA Setup Started",
      "profile",
      profile?.id ?? null,
      data.friendly_name ?? friendlyName,
      {
        device_name: data.friendly_name ?? friendlyName,
        summary: existingEnrollment
          ? "Regenerated an authenticator app setup QR code."
          : "Started authenticator app MFA setup.",
      }
    );
    setMfaMessage("Setup in progress. Scan the QR code, then enter the 6-digit code from your authenticator app.");
    setIsMfaWorking(false);
  };

  const handleCancelMfaEnrollment = async () => {
    if (!mfaEnrollment) return;

    const cancelledEnrollment = mfaEnrollment;

    setIsMfaWorking(true);
    setMfaMessage(feedbackMessages.loading("Cancelling authenticator setup"));

    const { error } = await supabase.auth.mfa.unenroll({
      factorId: cancelledEnrollment.factorId,
    });

    if (error) {
      setMfaMessage(feedbackMessages.error("We could not cancel authenticator setup.", error.message));
      setIsMfaWorking(false);
      return;
    }

    setMfaEnrollment(null);
    setMfaVerificationCodeInput("");
    setMfaMessage("Authenticator setup cancelled.");
    await loadMfaState();
    await writeAuditLog(
      "Profile",
      "MFA Setup Cancelled",
      "profile",
      profile?.id ?? null,
      cancelledEnrollment.friendlyName,
      {
        device_name: cancelledEnrollment.friendlyName,
        summary: "Cancelled authenticator app MFA setup before verification.",
      }
    );
    setIsMfaWorking(false);
  };

  const handleVerifyMfaEnrollment = async () => {
    if (!mfaEnrollment) return;

    const code = mfaVerificationCodeInput.trim();

    if (!/^\d{6}$/.test(code)) {
      setMfaMessage("Enter the exact 6-digit code from your authenticator app.");
      return;
    }

    setIsMfaWorking(true);
    setMfaMessage(feedbackMessages.loading("Verifying authenticator code"));

    const challenge = await supabase.auth.mfa.challenge({
      factorId: mfaEnrollment.factorId,
    });

    if (challenge.error) {
      setMfaMessage(feedbackMessages.error("We could not verify the authenticator code.", challenge.error.message));
      setIsMfaWorking(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: mfaEnrollment.factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verify.error) {
      setMfaMessage(feedbackMessages.error("We could not verify the authenticator code.", verify.error.message));
      setIsMfaWorking(false);
      return;
    }

    const enabledEnrollment = mfaEnrollment;

    setMfaEnrollment(null);
    setMfaVerificationCodeInput("");
    setMfaMessage("Authenticator app enabled. MFA will now be required after sign-in.");
    await loadMfaState();
    await refreshAuthenticatedAppData();
    await evaluateMfaChallengeRequirement();
    await writeAuditLog(
      "Profile",
      "MFA Enabled",
      "profile",
      profile?.id ?? null,
      enabledEnrollment.friendlyName,
      {
        device_name: enabledEnrollment.friendlyName,
        summary: "Enabled authenticator app multi-factor authentication.",
      }
    );
    setIsMfaWorking(false);
  };

  const handleRemoveMfaFactor = async (factorId: string) => {
    const factor = mfaFactors.find((item) => item.id === factorId) ?? null;
    const factorSummary = factor ? summarizeMfaFactor(factor) : null;

    setIsMfaWorking(true);
    setMfaMessage(feedbackMessages.loading("Removing authenticator device"));

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      setMfaMessage(feedbackMessages.error("We could not remove the authenticator device.", error.message));
      setIsMfaWorking(false);
      return;
    }

    if (typeof supabase.auth.refreshSession === "function") {
      await supabase.auth.refreshSession();
    }

    await loadMfaState();
    await writeAuditLog(
      "Profile",
      "MFA Device Removed",
      "profile",
      profile?.id ?? null,
      factorSummary?.label ?? "Authenticator device",
      {
        device_name: factorSummary?.label ?? "Authenticator device",
        previous_status: factorSummary?.statusLabel ?? factor?.status ?? "Unknown",
        summary: "Removed an authenticator app MFA device.",
      }
    );
    setMfaMessage("Authenticator device removed.");
    setIsMfaWorking(false);
  };

  return {
    handleProfileSave,
    handleProfileEmailChange,
    handleProfilePasswordChange,
    handleProfilePictureSelected,
    handleRemoveProfilePicture,
    handleStartMfaEnrollment,
    handleCancelMfaEnrollment,
    handleVerifyMfaEnrollment,
    handleRemoveMfaFactor,
  };
}
