import type { Dispatch, SetStateAction } from "react";

import {
  AuthCheckingScreen,
  LoginScreen,
  MfaChallengeScreen,
  PasswordRecoveryScreen,
} from "../auth/AuthScreens";
import {
  AppAuthenticatedLayout,
  type AppAuthenticatedLayoutProps,
} from "./AppAuthenticatedLayout";

type AsyncAction = () => void | Promise<void>;

type PasswordRecoveryRendererProps = {
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
};

type MfaChallengeRendererProps = {
  mfaChallengeCodeInput: string;
  isMfaChallengeSubmitting: boolean;
  isAuthGateChecking: boolean;
  loading: boolean;
  mfaChallengeMessage: string;
  setMfaChallengeCodeInput: Dispatch<SetStateAction<string>>;
  handleCompleteMfaChallenge: AsyncAction;
  handleLogout: AsyncAction;
};

type LoginRendererProps = {
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

export type AppRootRendererProps = AppAuthenticatedLayoutProps & {
  showPasswordRecoveryScreen: boolean;
  isAuthGateChecking: boolean;
  showMfaChallengeScreen: boolean;
  passwordRecoveryProps: PasswordRecoveryRendererProps;
  mfaChallengeProps: MfaChallengeRendererProps;
  loginProps: LoginRendererProps;
};

export function AppRootRenderer({
  showPasswordRecoveryScreen,
  isAuthGateChecking,
  showMfaChallengeScreen,
  passwordRecoveryProps,
  mfaChallengeProps,
  loginProps,
  ...authenticatedLayoutProps
}: AppRootRendererProps) {
  if (showPasswordRecoveryScreen) {
    return <PasswordRecoveryScreen {...passwordRecoveryProps} />;
  }

  if (isAuthGateChecking) {
    return <AuthCheckingScreen />;
  }

  if (showMfaChallengeScreen) {
    return <MfaChallengeScreen {...mfaChallengeProps} />;
  }

  if (!authenticatedLayoutProps.userEmail) {
    return <LoginScreen {...loginProps} />;
  }

  return <AppAuthenticatedLayout {...authenticatedLayoutProps} />;
}
