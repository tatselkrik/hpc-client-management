import { useCallback, useState } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type {
  AuthenticatorAssuranceState,
  MfaEnrollment,
  MfaFactor,
} from "../../appShared";
import { DEFAULT_MFA_FRIENDLY_NAME } from "../../appShared";

const emptyMfaAssurance = (): AuthenticatorAssuranceState => ({
  currentLevel: null,
  nextLevel: null,
});

export function useProfileMfaState() {
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaAssurance, setMfaAssurance] =
    useState<AuthenticatorAssuranceState>(emptyMfaAssurance());
  const [mfaMessage, setMfaMessage] = useState("");
  const [mfaFriendlyNameInput, setMfaFriendlyNameInput] = useState(DEFAULT_MFA_FRIENDLY_NAME);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [mfaVerificationCodeInput, setMfaVerificationCodeInput] = useState("");
  const [isMfaWorking, setIsMfaWorking] = useState(false);
  const [showMfaChallengeScreen, setShowMfaChallengeScreen] = useState(false);
  const [mfaChallengeCodeInput, setMfaChallengeCodeInput] = useState("");
  const [mfaChallengeMessage, setMfaChallengeMessage] = useState("");
  const [isMfaChallengeSubmitting, setIsMfaChallengeSubmitting] = useState(false);

  const loadMfaState = useCallback(async () => {
    const [factorsResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsResult.error) {
      setMfaMessage(feedbackMessages.loadFailed("security settings", factorsResult.error.message));
      return;
    }

    if (assuranceResult.error) {
      setMfaMessage(feedbackMessages.loadFailed("security settings", assuranceResult.error.message));
      return;
    }

    const factorData = factorsResult.data;
    const nextFactors: MfaFactor[] = [...(factorData.totp ?? []), ...(factorData.phone ?? [])]
      .map((factor) => ({
        id: factor.id,
        factor_type: factor.factor_type ?? "totp",
        status: factor.status ?? "unverified",
        friendly_name: factor.friendly_name ?? null,
        phone: "phone" in factor && typeof factor.phone === "string" ? factor.phone : null,
        created_at: "created_at" in factor ? factor.created_at ?? null : null,
      }))
      .sort((left, right) => {
        if (left.status === "verified" && right.status !== "verified") return -1;
        if (left.status !== "verified" && right.status === "verified") return 1;
        return (left.friendly_name ?? left.factor_type).localeCompare(
          right.friendly_name ?? right.factor_type
        );
      });

    setMfaFactors(nextFactors);
    setMfaAssurance({
      currentLevel: assuranceResult.data.currentLevel ?? null,
      nextLevel: assuranceResult.data.nextLevel ?? null,
    });

    setMfaMessage((currentMessage) =>
      currentMessage.startsWith("We could not load the security settings.") ? "" : currentMessage
    );
  }, []);

  const resetMfaState = useCallback(() => {
    setMfaFactors([]);
    setMfaAssurance(emptyMfaAssurance());
    setMfaEnrollment(null);
    setMfaVerificationCodeInput("");
    setMfaMessage("");
    setShowMfaChallengeScreen(false);
    setMfaChallengeCodeInput("");
    setMfaChallengeMessage("");
    setIsMfaChallengeSubmitting(false);
    setIsMfaWorking(false);
  }, []);

  const hasVerifiedMfaForProfileChanges = useCallback(
    () =>
      mfaFactors.some((factor) => factor.status === "verified") ||
      mfaAssurance.nextLevel === "aal2",
    [mfaAssurance.nextLevel, mfaFactors]
  );

  const confirmMfaForSensitiveProfileChange = useCallback(
    async (
      codeInput: string,
      setMessage: (value: string) => void,
      actionLabel: string
    ) => {
      const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (assuranceResult.error) {
        setMessage(feedbackMessages.error("We could not complete the security check.", assuranceResult.error.message));
        return false;
      }

      const requiresAal2 = assuranceResult.data.nextLevel === "aal2";

      if (!requiresAal2 || assuranceResult.data.currentLevel === "aal2") {
        await loadMfaState();
        return true;
      }

      const code = codeInput.trim();

      if (!/^\d{6}$/.test(code)) {
        setMessage(`Enter your current 6-digit MFA code to ${actionLabel}.`);
        return false;
      }

      setMessage(feedbackMessages.loading("Verifying MFA code"));

      const factorsResult = await supabase.auth.mfa.listFactors();

      if (factorsResult.error) {
        setMessage(feedbackMessages.loadFailed("MFA devices", factorsResult.error.message));
        return false;
      }

      const verifiedFactor = [
        ...(factorsResult.data.totp ?? []),
        ...(factorsResult.data.phone ?? []),
      ].find((factor) => factor.status === "verified");

      if (!verifiedFactor) {
        await loadMfaState();
        return true;
      }

      const challenge = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challenge.error) {
        setMessage(feedbackMessages.error("We could not start MFA verification.", challenge.error.message));
        return false;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) {
        setMessage(feedbackMessages.error("We could not verify the MFA code.", verify.error.message));
        return false;
      }

      await loadMfaState();
      return true;
    },
    [loadMfaState]
  );

  return {
    mfaFactors,
    setMfaFactors,
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
  };
}
