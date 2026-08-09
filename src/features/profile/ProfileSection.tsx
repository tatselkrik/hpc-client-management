import { StatusMessage } from "../../components/StatusMessage";
import type { ChangeEvent, RefObject } from "react";
import { SectionHeader } from "../../components/SectionHeader";

import type {
  AuthenticatorAssuranceState,
  MfaEnrollment,
  MfaFactor,
  Profile,
} from "../../appShared";
import {
  DEFAULT_MFA_FRIENDLY_NAME,
  getCurrentMfaProtectionLabel,
  getMfaSetupStateLabel,
  getProfileDisplayName,
  getProfileDisplayRole,
  getProfileInitial,
  getTwoStepVerificationStatusLabel,
  PROFILE_PICTURE_ACCEPT,
  PROFILE_PICTURE_HELP_TEXT,
  summarizeMfaFactor,
} from "../../appShared";

export type ProfileSectionProps = {
  profile: Profile | null;
  userEmail: string | null;
  profileAvatarUrl: string | null;
  profilePictureInputRef: RefObject<HTMLInputElement | null>;
  handleProfilePictureSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProfilePicture: () => void;
  isProfileSavingPicture: boolean;
  profilePictureMessage: string;
  profileNameInput: string;
  setProfileNameInput: (value: string) => void;
  handleProfileSave: () => void;
  isProfileSavingName: boolean;
  profileMessage: string;
  profileEmailInput: string;
  setProfileEmailInput: (value: string) => void;
  profileCurrentPasswordInput: string;
  setProfileCurrentPasswordInput: (value: string) => void;
  profileEmailMfaCodeInput: string;
  setProfileEmailMfaCodeInput: (value: string) => void;
  handleProfileEmailChange: () => void;
  isProfileSavingEmail: boolean;
  profileEmailMessage: string;
  profilePasswordCurrentInput: string;
  setProfilePasswordCurrentInput: (value: string) => void;
  profilePasswordNewInput: string;
  setProfilePasswordNewInput: (value: string) => void;
  profilePasswordConfirmInput: string;
  setProfilePasswordConfirmInput: (value: string) => void;
  profilePasswordMfaCodeInput: string;
  setProfilePasswordMfaCodeInput: (value: string) => void;
  handleProfilePasswordChange: () => void;
  isProfileSavingPassword: boolean;
  profilePasswordMessage: string;
  mfaAssurance: AuthenticatorAssuranceState;
  mfaFactors: MfaFactor[];
  mfaEnrollment: MfaEnrollment | null;
  mfaVerificationCodeInput: string;
  setMfaVerificationCodeInput: (value: string) => void;
  handleVerifyMfaEnrollment: () => void;
  handleCancelMfaEnrollment: () => void;
  isMfaWorking: boolean;
  mfaFriendlyNameInput: string;
  setMfaFriendlyNameInput: (value: string) => void;
  handleStartMfaEnrollment: () => void;
  handleRemoveMfaFactor: (factorId: string) => void | Promise<void>;
  mfaMessage: string;
  mfaEnrollmentRequired: boolean;
};

export function ProfileSection({
  profile,
  userEmail,
  profileAvatarUrl,
  profilePictureInputRef,
  handleProfilePictureSelected,
  handleRemoveProfilePicture,
  isProfileSavingPicture,
  profilePictureMessage,
  profileNameInput,
  setProfileNameInput,
  handleProfileSave,
  isProfileSavingName,
  profileMessage,
  profileEmailInput,
  setProfileEmailInput,
  profileCurrentPasswordInput,
  setProfileCurrentPasswordInput,
  profileEmailMfaCodeInput,
  setProfileEmailMfaCodeInput,
  handleProfileEmailChange,
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
  handleProfilePasswordChange,
  isProfileSavingPassword,
  profilePasswordMessage,
  mfaAssurance,
  mfaFactors,
  mfaEnrollment,
  mfaVerificationCodeInput,
  setMfaVerificationCodeInput,
  handleVerifyMfaEnrollment,
  handleCancelMfaEnrollment,
  isMfaWorking,
  mfaFriendlyNameInput,
  setMfaFriendlyNameInput,
  handleStartMfaEnrollment,
  handleRemoveMfaFactor,
  mfaMessage,
  mfaEnrollmentRequired,
}: ProfileSectionProps) {
  const mfaStatusLabel = getMfaSetupStateLabel(
    mfaAssurance.currentLevel,
    mfaAssurance.nextLevel,
    mfaFactors,
    Boolean(mfaEnrollment)
  );
  const shouldShowSensitiveMfaCode =
    mfaAssurance.nextLevel === "aal2" ||
    mfaFactors.some((factor) => factor.status === "verified");

  return (
    <div className="page-content profile-page">
      <h2>Profile</h2>

      {mfaEnrollmentRequired && (
        <div className="panel status-message">
          MFA setup is required before this account can access clinic records. Go to
          Security below, add an authenticator app, scan the QR code, and verify the
          6-digit code.
        </div>
      )}

      <div className="profile-grid">
        <div className="panel profile-panel profile-section-card">
          <SectionHeader
            className="section-header"
            title="Profile picture"
            description="Upload a square staff photo for your profile card and account identity inside the app."
            descriptionClassName="profile-section-copy"
          />

          <div className="profile-picture-panel">
            <div className="profile-picture-preview" aria-hidden="true">
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt=""
                  className="profile-picture-preview-image"
                />
              ) : (
                <div className="profile-picture-preview-fallback">
                  {getProfileInitial(profile?.full_name, userEmail)}
                </div>
              )}
            </div>

            <div className="profile-picture-copy">
              <strong>{getProfileDisplayName(profile?.full_name)}</strong>
              <input
                ref={profilePictureInputRef}
                type="file"
                accept={PROFILE_PICTURE_ACCEPT}
                className="hidden-file-input"
                onChange={handleProfilePictureSelected}
              />
              <span className="profile-picture-note">{PROFILE_PICTURE_HELP_TEXT}</span>

              <div className="profile-actions-row profile-picture-actions">
                <button
                  type="button"
                  className="small-button"
                  onClick={() => profilePictureInputRef.current?.click()}
                  disabled={isProfileSavingPicture}
                >
                  {isProfileSavingPicture
                    ? "Saving..."
                    : profile?.avatar_path?.trim()
                      ? "Change Picture"
                      : "Upload Picture"}
                </button>

                <button
                  type="button"
                  className="small-button danger-button"
                  onClick={handleRemoveProfilePicture}
                  disabled={isProfileSavingPicture || !profile?.avatar_path?.trim()}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <StatusMessage className="profile-status-text" message={profilePictureMessage} />
        </div>

        <div className="panel profile-panel profile-section-card">
          <SectionHeader
            className="section-header"
            title="Profile details"
            description="Update your display name and review your current staff account details."
            descriptionClassName="profile-section-copy"
          />

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span>Email</span>
              <strong>{userEmail || "No email loaded"}</strong>
            </div>
            <div className="profile-info-item">
              <span>Role</span>
              <strong>{getProfileDisplayRole(profile?.role)}</strong>
            </div>
          </div>

          <div className="profile-name-edit-row">
            <label className="form-label profile-name-inline-label">
              Full Name
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                className="search-input"
                disabled={isProfileSavingName}
              />
            </label>

            <button
              className="small-button profile-name-save-button"
              onClick={handleProfileSave}
              disabled={isProfileSavingName}
            >
              {isProfileSavingName ? "Saving..." : "Save Name"}
            </button>
          </div>

          <StatusMessage className="profile-status-text" message={profileMessage} />
        </div>

        <div className="panel profile-panel profile-section-card">
          <SectionHeader
            className="section-header"
            title="Change email"
            description="Keep your sign-in email current. Confirmation may be required from both your current and new inboxes before the new address becomes active."
            descriptionClassName="profile-section-copy"
          />

          <label className="form-label">
            New Email Address
            <input
              type="email"
              value={profileEmailInput}
              onChange={(e) => setProfileEmailInput(e.target.value)}
              className="search-input"
              disabled={isProfileSavingEmail}
            />
          </label>

          <label className="form-label">
            Current Password
            <input
              type="password"
              value={profileCurrentPasswordInput}
              onChange={(e) => setProfileCurrentPasswordInput(e.target.value)}
              className="search-input"
              placeholder="Confirm with your current password"
              disabled={isProfileSavingEmail}
            />
          </label>

          {shouldShowSensitiveMfaCode ? (
            <label className="form-label">
              MFA Code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={profileEmailMfaCodeInput}
                onChange={(e) => setProfileEmailMfaCodeInput(e.target.value)}
                className="search-input"
                placeholder="Enter your current 6-digit authenticator code"
                maxLength={6}
                disabled={isProfileSavingEmail}
              />
              <small className="field-hint">
                For your security, please enter a code from your authenticator app before changing your sign-in email.
              </small>
            </label>
          ) : null}

          <div className="profile-actions-row profile-submit-actions">
            <button
              className="small-button"
              onClick={handleProfileEmailChange}
              disabled={isProfileSavingEmail}
            >
              {isProfileSavingEmail ? "Updating..." : "Request Email Change"}
            </button>
          </div>

          <StatusMessage className="profile-status-text" message={profileEmailMessage} />
        </div>

        <div className="panel profile-panel profile-section-card">
          <SectionHeader
            className="section-header"
            title="Change password"
            description="Update your sign-in password from inside your account. Your current password is required before the new one is saved."
            descriptionClassName="profile-section-copy"
          />

          <div className="profile-password-guidance">
            <span>Password requirements</span>
            <small>Use at least 8 characters, one letter, one number, and choose something different from your current password.</small>
          </div>

          <label className="form-label">
            Current Password
            <input
              type="password"
              value={profilePasswordCurrentInput}
              onChange={(e) => setProfilePasswordCurrentInput(e.target.value)}
              className="search-input"
              placeholder="Enter your current password"
              disabled={isProfileSavingPassword}
            />
          </label>

          {shouldShowSensitiveMfaCode ? (
            <label className="form-label">
              MFA Code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={profilePasswordMfaCodeInput}
                onChange={(e) => setProfilePasswordMfaCodeInput(e.target.value)}
                className="search-input"
                placeholder="Enter your current 6-digit authenticator code"
                maxLength={6}
                disabled={isProfileSavingPassword}
              />
              <small className="field-hint">
                For your security, please enter a code from your authenticator app before updating your password.
              </small>
            </label>
          ) : null}

          <div className="profile-password-grid">
            <label className="form-label">
              New Password
              <input
                type="password"
                value={profilePasswordNewInput}
                onChange={(e) => setProfilePasswordNewInput(e.target.value)}
                className="search-input"
                placeholder="Enter a new password"
                disabled={isProfileSavingPassword}
              />
            </label>

            <label className="form-label">
              Confirm New Password
              <input
                type="password"
                value={profilePasswordConfirmInput}
                onChange={(e) => setProfilePasswordConfirmInput(e.target.value)}
                className="search-input"
                placeholder="Re-enter the new password"
                disabled={isProfileSavingPassword}
              />
            </label>
          </div>

          <div className="profile-actions-row profile-submit-actions">
            <button
              className="small-button"
              onClick={handleProfilePasswordChange}
              disabled={isProfileSavingPassword}
            >
              {isProfileSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>

          <StatusMessage className="profile-status-text" message={profilePasswordMessage} />
        </div>

        <div className="panel profile-panel profile-section-card profile-section-card-wide">
          <SectionHeader
            className="section-header"
            title="Multi-factor authentication"
            description="Use Google Authenticator or another compatible authenticator app for a second sign-in code."
            descriptionClassName="profile-section-copy"
            actions={
              <div className="profile-mfa-header-badges">
                <span className="settings-module-badge live">Recommended</span>
                <span className="profile-mfa-state-badge">{mfaStatusLabel}</span>
              </div>
            }
          />

          <div className="profile-security-summary">
            <div className="profile-info-item">
              <span>Current protection</span>
              <strong>{getCurrentMfaProtectionLabel(mfaAssurance.currentLevel, mfaFactors)}</strong>
            </div>
            <div className="profile-info-item">
              <span>Two-step verification</span>
              <strong>
                {getTwoStepVerificationStatusLabel(
                  mfaAssurance.currentLevel,
                  mfaAssurance.nextLevel,
                  mfaFactors
                )}
              </strong>
            </div>
            <div className="profile-info-item">
              <span>MFA status</span>
              <strong>{mfaStatusLabel}</strong>
            </div>
            <div className="profile-info-item">
              <span>Configured devices</span>
              <strong>{mfaFactors.length}</strong>
            </div>
          </div>

          {mfaEnrollment ? (
            <div className="profile-mfa-enrollment">
              <div className="profile-mfa-qr-card">
                {mfaEnrollment.qrCode ? (
                  <img
                    src={mfaEnrollment.qrCode}
                    alt="Authenticator QR code"
                    className="profile-mfa-qr-image"
                  />
                ) : (
                  <div className="empty-state">Unable to render the QR code for this device.</div>
                )}
              </div>

              <div className="profile-mfa-enrollment-copy">
                <div className="profile-mfa-secret-block">
                  <span>Device name</span>
                  <strong>{mfaEnrollment.friendlyName}</strong>
                </div>
                <div className="profile-mfa-secret-block">
                  <span>Manual setup key</span>
                  <strong className="profile-mfa-secret-value">{mfaEnrollment.secret}</strong>
                </div>
                {mfaEnrollment.uri ? (
                  <div className="profile-mfa-secret-block">
                    <span>Setup URI</span>
                    <small className="profile-mfa-uri">{mfaEnrollment.uri}</small>
                  </div>
                ) : null}

                <label className="form-label">
                  Verification Code
                  <input
                    type="text"
                    value={mfaVerificationCodeInput}
                    onChange={(e) =>
                      setMfaVerificationCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="search-input"
                    placeholder="Enter the 6-digit code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={isMfaWorking}
                  />
                </label>

                <div className="profile-actions-row">
                  <button
                    className="small-button"
                    onClick={handleVerifyMfaEnrollment}
                    disabled={isMfaWorking}
                  >
                    {isMfaWorking ? "Verifying..." : "Enable MFA"}
                  </button>
                  <button
                    className="small-button profile-secondary-button"
                    onClick={handleStartMfaEnrollment}
                    disabled={isMfaWorking}
                  >
                    Regenerate QR
                  </button>
                  <button
                    className="small-button profile-secondary-button"
                    onClick={handleCancelMfaEnrollment}
                    disabled={isMfaWorking}
                  >
                    Cancel
                  </button>
                </div>

                <p className="profile-mfa-note">
                  Save access to your authenticator app. This app does not generate backup codes,
                  so an Admin may need to reset your MFA if you lose your device.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-mfa-setup-row">
                <label className="form-label profile-mfa-name-label">
                  Device Name
                  <input
                    type="text"
                    value={mfaFriendlyNameInput}
                    onChange={(e) => setMfaFriendlyNameInput(e.target.value)}
                    className="search-input"
                    placeholder={DEFAULT_MFA_FRIENDLY_NAME}
                    maxLength={64}
                    disabled={isMfaWorking}
                  />
                </label>

                <div className="profile-actions-row profile-mfa-setup-actions">
                  <button
                    className="small-button"
                    onClick={handleStartMfaEnrollment}
                    disabled={isMfaWorking}
                  >
                    {isMfaWorking ? "Preparing..." : "+ Add Authenticator App"}
                  </button>
                </div>
              </div>

              <p className="profile-mfa-note">
                MFA state: {mfaStatusLabel}. Use one authenticator device per staff account when possible.
              </p>

              <div className="profile-mfa-factor-list">
                {mfaFactors.length === 0 ? (
                  <div className="empty-state">
                    No authenticator app is connected yet. Add one to require a second sign-in code.
                  </div>
                ) : (
                  mfaFactors.map((factor) => {
                    const summary = summarizeMfaFactor(factor);

                    return (
                      <div className="profile-mfa-factor-card" key={factor.id}>
                        <div className="profile-mfa-factor-copy">
                          <strong>{summary.label}</strong>
                          <span>
                            {summary.statusLabel}
                            {factor.created_at
                              ? ` • Added ${new Date(factor.created_at).toLocaleDateString()}`
                              : ""}
                            {factor.phone ? ` • ${factor.phone}` : ""}
                          </span>
                        </div>

                        <button
                          className="small-button danger-button"
                          onClick={() => void handleRemoveMfaFactor(factor.id)}
                          disabled={isMfaWorking}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          <StatusMessage className="profile-status-text" message={mfaMessage} />
        </div>
      </div>
    </div>
  );
}
