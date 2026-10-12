import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

// Missing capability means the old backend, never permission to bypass MFA.
// This affects UI only; the database and Auth service enforce access themselves.
let verificationRequired = true;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const MFA_ENROLLMENT_ENABLED = false;
export const useMfaVerificationRequired = () =>
  useSyncExternalStore(subscribe, () => verificationRequired);

export async function refreshAuthenticationPolicy(): Promise<boolean> {
  const { data, error } = await supabase.rpc("hpc_authentication_policy");
  const missingLegacyCapability = error?.code === "PGRST202";
  if (error && !missingLegacyCapability) {
    throw new Error("Could not check the clinic authentication policy. Please try signing in again.");
  }
  if (!error && data !== "password" && data !== "mfa") {
    throw new Error("Unrecognized clinic authentication policy. Please contact your administrator.");
  }
  verificationRequired = missingLegacyCapability || data === "mfa";
  listeners.forEach(listener => listener());
  return verificationRequired;
}
