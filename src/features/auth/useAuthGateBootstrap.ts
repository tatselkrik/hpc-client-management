import { useEffect, type Dispatch, type SetStateAction } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import {
  clearPasswordRecoveryHash,
  emptyDashboardAnnouncement,
  getHasAccountInvitationHash,
  getHasPasswordRecoveryHash,
  type DashboardAnnouncement,
} from "../../appShared";
import { getFriendlyAuthErrorMessage } from "./authValidation";

type MfaChallengeStatus = "challenge" | "verified" | "error";

type UseAuthGateBootstrapOptions = {
  evaluateMfaChallengeRequirement: () => Promise<MfaChallengeStatus>;
  refreshAuthenticatedAppData: () => Promise<boolean>;
  setDashboardAnnouncement: Dispatch<SetStateAction<DashboardAnnouncement>>;
  setIsAuthGateChecking: Dispatch<SetStateAction<boolean>>;
  setPasswordRecoveryMessage: Dispatch<SetStateAction<string>>;
  setIsInvitationPasswordSetup: Dispatch<SetStateAction<boolean>>;
  setRecoveryPassword: Dispatch<SetStateAction<string>>;
  setRecoveryPasswordConfirm: Dispatch<SetStateAction<string>>;
  setShowMfaChallengeScreen: Dispatch<SetStateAction<boolean>>;
  setShowPasswordRecoveryScreen: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setUserEmail: Dispatch<SetStateAction<string | null>>;
};

export function useAuthGateBootstrap({
  evaluateMfaChallengeRequirement,
  refreshAuthenticatedAppData,
  setDashboardAnnouncement,
  setIsAuthGateChecking,
  setPasswordRecoveryMessage,
  setIsInvitationPasswordSetup,
  setRecoveryPassword,
  setRecoveryPasswordConfirm,
  setShowMfaChallengeScreen,
  setShowPasswordRecoveryScreen,
  setStatus,
  setUserEmail,
}: UseAuthGateBootstrapOptions) {
  useEffect(() => {
    const checkSession = async () => {
      setIsAuthGateChecking(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus(feedbackMessages.error("We could not check your session.", getFriendlyAuthErrorMessage(error)));
        setIsAuthGateChecking(false);
        return;
      }

      if (data.session?.user?.email) {
        setUserEmail(data.session.user.email);

        const isInvitation = getHasAccountInvitationHash();

        if (getHasPasswordRecoveryHash() || isInvitation) {
          setIsInvitationPasswordSetup(isInvitation);
          setShowPasswordRecoveryScreen(true);
          setPasswordRecoveryMessage(
            isInvitation
              ? "Choose your password to accept the invitation."
              : "Choose a new password to finish resetting your sign-in."
          );
          setIsAuthGateChecking(false);
          return;
        }

        const mfaStatus = await evaluateMfaChallengeRequirement();

        if (mfaStatus === "challenge") {
          setStatus("Enter your authenticator code to continue.");
          setIsAuthGateChecking(false);
          return;
        }

        if (mfaStatus === "error") {
          await supabase.auth.signOut();
          setUserEmail(null);
          setIsAuthGateChecking(false);
          return;
        }

        await refreshAuthenticatedAppData();
      } else {
        setDashboardAnnouncement(emptyDashboardAnnouncement());
        setShowMfaChallengeScreen(false);
      }

      setIsAuthGateChecking(false);
    };

    void checkSession();
  }, [
    evaluateMfaChallengeRequirement,
    refreshAuthenticatedAppData,
    setDashboardAnnouncement,
    setIsAuthGateChecking,
    setIsInvitationPasswordSetup,
    setPasswordRecoveryMessage,
    setShowMfaChallengeScreen,
    setShowPasswordRecoveryScreen,
    setStatus,
    setUserEmail,
  ]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsInvitationPasswordSetup(false);
        setUserEmail(session?.user?.email ?? null);
        setShowPasswordRecoveryScreen(true);
        setRecoveryPassword("");
        setRecoveryPasswordConfirm("");
        setPasswordRecoveryMessage("Choose a new password to finish resetting your sign-in.");
        setStatus("Password recovery link opened.");
        setIsAuthGateChecking(false);
        return;
      }

      if (
        event === "SIGNED_IN" &&
        (getHasPasswordRecoveryHash() || getHasAccountInvitationHash())
      ) {
        const isInvitation = getHasAccountInvitationHash();
        setUserEmail(session?.user?.email ?? null);
        setIsInvitationPasswordSetup(isInvitation);
        setShowPasswordRecoveryScreen(true);
        setPasswordRecoveryMessage(
          isInvitation
            ? "Choose your password to accept the invitation."
            : "Choose a new password to finish resetting your sign-in."
        );
        setIsAuthGateChecking(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        setShowPasswordRecoveryScreen(false);
        setRecoveryPassword("");
        setRecoveryPasswordConfirm("");
        setPasswordRecoveryMessage("");
        setIsInvitationPasswordSetup(false);
        setShowMfaChallengeScreen(false);
        setIsAuthGateChecking(false);
        clearPasswordRecoveryHash();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    setIsAuthGateChecking,
    setIsInvitationPasswordSetup,
    setPasswordRecoveryMessage,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setShowMfaChallengeScreen,
    setShowPasswordRecoveryScreen,
    setStatus,
    setUserEmail,
  ]);
}
