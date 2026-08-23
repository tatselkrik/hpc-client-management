import type { Dispatch, SetStateAction } from "react";
import { CLINIC_NAME } from "../../appShared";

type AsyncAction = () => void | Promise<void>;

type AuthCheckingScreenProps = Record<string, never>;

export function AuthCheckingScreen(_props: AuthCheckingScreenProps) {
  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img
            src="/hpc-logo.svg"
            alt={CLINIC_NAME}
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">Client Management</h1>
        </div>

        <div className="login-form">
          <p className="login-status-text login-status-text-center">Checking your secure session...</p>
        </div>
      </div>
    </main>
  );
}

type LoginScreenProps = {
  email: string;
  password: string;
  isLoginBusy: boolean;
  loading: boolean;
  status: string;
  isLoginCapsLockOn: boolean;
  setEmail: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setIsLoginCapsLockOn: Dispatch<SetStateAction<boolean>>;
  handleLogin: AsyncAction;
  handleForgotPassword: AsyncAction;
};

export function LoginScreen({
  email,
  password,
  isLoginBusy,
  loading,
  status,
  isLoginCapsLockOn,
  setEmail,
  setPassword,
  setIsLoginCapsLockOn,
  handleLogin,
  handleForgotPassword,
}: LoginScreenProps) {
  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img
            src="/hpc-logo.svg"
            alt={CLINIC_NAME}
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">Client Management</h1>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={isLoginBusy}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => setIsLoginCapsLockOn(event.getModifierState("CapsLock"))}
            onKeyUp={(event) => setIsLoginCapsLockOn(event.getModifierState("CapsLock"))}
            onBlur={() => setIsLoginCapsLockOn(false)}
            autoComplete="current-password"
            disabled={isLoginBusy}
          />

          {isLoginCapsLockOn ? (
            <p className="login-warning-text">Caps Lock is on.</p>
          ) : null}

          <p className="login-helper-copy">
            Password recovery is not available yet. It will be enabled once the clinic website is available.
          </p>

          <button
            type="button"
            className="login-link-button"
            onClick={() => void handleForgotPassword()}
            disabled
          >
            Password recovery unavailable
          </button>

          <button type="submit" disabled={isLoginBusy}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="login-status-text">{status}</p>
        </form>
      </div>
    </main>
  );
}

type PasswordRecoveryScreenProps = {
  recoveryPassword: string;
  recoveryPasswordConfirm: string;
  isPasswordRecoverySubmitting: boolean;
  isRecoveryCapsLockOn: boolean;
  loading: boolean;
  passwordRecoveryMessage: string;
  setRecoveryPassword: Dispatch<SetStateAction<string>>;
  setRecoveryPasswordConfirm: Dispatch<SetStateAction<string>>;
  setIsRecoveryCapsLockOn: Dispatch<SetStateAction<boolean>>;
  handleCompletePasswordRecovery: AsyncAction;
  handleLogout: AsyncAction;
  isInvitationPasswordSetup: boolean;
};

export function PasswordRecoveryScreen({
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
  isInvitationPasswordSetup,
}: PasswordRecoveryScreenProps) {
  return (
    <main className="login-screen mfa-screen">
      <div className="login-card mfa-card">
        <div className="login-brand">
          <img
            src="/hpc-logo.svg"
            alt={CLINIC_NAME}
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">
            {isInvitationPasswordSetup ? "Set up your account" : "Reset password"}
          </h1>
        </div>

        <div className="login-form">
          <p className="mfa-screen-copy">
            {isInvitationPasswordSetup
              ? "Choose your own password to accept this invitation. Use at least 8 characters with one letter and one number."
              : "Create a new password to finish recovering your sign-in. Use at least 8 characters with one letter and one number."}
          </p>

          <input
            type="password"
            placeholder="New password"
            value={recoveryPassword}
            onChange={(event) => setRecoveryPassword(event.target.value)}
            onKeyDown={(event) => setIsRecoveryCapsLockOn(event.getModifierState("CapsLock"))}
            onKeyUp={(event) => setIsRecoveryCapsLockOn(event.getModifierState("CapsLock"))}
            onBlur={() => setIsRecoveryCapsLockOn(false)}
            disabled={isPasswordRecoverySubmitting}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={recoveryPasswordConfirm}
            onChange={(event) => setRecoveryPasswordConfirm(event.target.value)}
            onKeyDown={(event) => setIsRecoveryCapsLockOn(event.getModifierState("CapsLock"))}
            onKeyUp={(event) => setIsRecoveryCapsLockOn(event.getModifierState("CapsLock"))}
            onBlur={() => setIsRecoveryCapsLockOn(false)}
            disabled={isPasswordRecoverySubmitting}
          />

          {isRecoveryCapsLockOn ? (
            <p className="login-warning-text">Caps Lock is on.</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCompletePasswordRecovery()}
            disabled={isPasswordRecoverySubmitting}
          >
            {isPasswordRecoverySubmitting
              ? "Updating..."
              : isInvitationPasswordSetup
                ? "Set Password"
                : "Update Password"}
          </button>

          <button
            type="button"
            className="small-button profile-secondary-button login-secondary-button"
            onClick={() => void handleLogout()}
            disabled={loading || isPasswordRecoverySubmitting}
          >
            Cancel
          </button>

          {passwordRecoveryMessage ? <p>{passwordRecoveryMessage}</p> : null}
        </div>
      </div>
    </main>
  );
}

type MfaChallengeScreenProps = {
  mfaChallengeCodeInput: string;
  isMfaChallengeSubmitting: boolean;
  isAuthGateChecking: boolean;
  loading: boolean;
  mfaChallengeMessage: string;
  setMfaChallengeCodeInput: Dispatch<SetStateAction<string>>;
  handleCompleteMfaChallenge: AsyncAction;
  handleLogout: AsyncAction;
};

export function MfaChallengeScreen({
  mfaChallengeCodeInput,
  isMfaChallengeSubmitting,
  isAuthGateChecking,
  loading,
  mfaChallengeMessage,
  setMfaChallengeCodeInput,
  handleCompleteMfaChallenge,
  handleLogout,
}: MfaChallengeScreenProps) {
  return (
    <main className="login-screen mfa-screen">
      <div className="login-card mfa-card">
        <div className="login-brand">
          <img
            src="/hpc-logo.svg"
            alt={CLINIC_NAME}
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">Multi-factor authentication</h1>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCompleteMfaChallenge();
          }}
        >
          <p className="mfa-screen-copy">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={mfaChallengeCodeInput}
            onChange={(event) =>
              setMfaChallengeCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={isMfaChallengeSubmitting || isAuthGateChecking}
          />

          <button type="submit" disabled={isMfaChallengeSubmitting || isAuthGateChecking}>
            {isMfaChallengeSubmitting ? "Verifying..." : "Verify Code"}
          </button>

          <button
            type="button"
            className="small-button profile-secondary-button login-secondary-button"
            onClick={() => void handleLogout()}
            disabled={loading || isMfaChallengeSubmitting}
          >
            Sign Out
          </button>

          {mfaChallengeMessage ? <p>{mfaChallengeMessage}</p> : null}
        </form>
      </div>
    </main>
  );
}
