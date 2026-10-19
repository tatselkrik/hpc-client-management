import { useEffect, type Dispatch, type SetStateAction } from "react";

import { supabase } from "../../lib/supabase";
import { getClinicalSessionGeneration, isClinicalSessionLocked, lockClinicalSession, observeClinicalIdentity } from "../../lib/clinicalSession";
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
    let disposed = false;
    const generation = getClinicalSessionGeneration();
    const isCurrent = () => !disposed && generation === getClinicalSessionGeneration();
    const checkSession = async () => {
      setIsAuthGateChecking(true);
      try {
      if (isClinicalSessionLocked()) {
        setUserEmail(null);
        setStatus("Session locked. Please sign in again.");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isCurrent() || isClinicalSessionLocked()) return;

      if (error) {
        setStatus(feedbackMessages.error("We could not check your session.", getFriendlyAuthErrorMessage(error)));
        setIsAuthGateChecking(false);
        return;
      }

      if (data.session?.user?.email) {
        if (!observeClinicalIdentity(data.session.user.id)) return;
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
        if (!isCurrent() || isClinicalSessionLocked()) return;

        if (mfaStatus === "challenge") {
          setStatus("Enter your authenticator code to continue.");
          setIsAuthGateChecking(false);
          return;
        }

        if (mfaStatus === "error") {
          lockClinicalSession();
          void supabase.auth.signOut().catch(() => undefined);
          setUserEmail(null);
          setIsAuthGateChecking(false);
          return;
        }

        const loaded = await refreshAuthenticatedAppData();
        if (isCurrent() && !loaded) setUserEmail(null);
      } else {
        setDashboardAnnouncement(emptyDashboardAnnouncement());
        setShowMfaChallengeScreen(false);
      }

      } catch {
        if (isCurrent()) {
          setUserEmail(null);
          setStatus("We could not load your session. Please sign in again.");
        }
      } finally {
        if (isCurrent()) setIsAuthGateChecking(false);
      }
    };

    void checkSession();
    return () => { disposed = true; };
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
      if (event === "SIGNED_OUT") {
        setUserEmail(null);
        lockClinicalSession();
      } else if (session && !observeClinicalIdentity(session.user.id)) {
        return;
      }
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
