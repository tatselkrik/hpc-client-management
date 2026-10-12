import { useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { ProfileSection, type ProfileSectionProps } from "../features/profile/ProfileSection";
import { useAuthSessionActions } from "../features/auth/useAuthSessionActions";
import { useProfileMfaState } from "../features/profile/useProfileMfaState";
import { supabase } from "../lib/supabase";
import { refreshAuthenticationPolicy } from "../lib/authPolicy";
import { AppointmentAnalyticsPanel } from "../features/analytics/AppointmentAnalyticsPanel";
import "../App.css";

const events: string[] = [];
const mode = new URLSearchParams(location.search).get("mode");
let verified = mode === "verified";
supabase.auth.signOut = async () => ({ error: null });
const forbiddenMfaCall = async (): Promise<never> => {
  events.push("MFA API called");
  throw new Error("MFA must not be called by the retired authentication flow");
};
supabase.auth.mfa.getAuthenticatorAssuranceLevel = forbiddenMfaCall;
supabase.auth.mfa.listFactors = forbiddenMfaCall;
if (mode === "legacy" || mode === "verified" || mode === "unenrolled") {
  supabase.auth.mfa.getAuthenticatorAssuranceLevel = async () => ({ data: {
    currentLevel: verified ? "aal2" : "aal1",
    nextLevel: mode === "unenrolled" ? "aal1" : "aal2", currentAuthenticationMethods: [],
  }, error: null });
  supabase.auth.mfa.listFactors = async () => ({ data: {
    all: [], phone: [], webauthn: [], totp: mode === "unenrolled" ? [] : [{
      id: "fixture-factor", factor_type: "totp", status: "verified",
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    }],
  }, error: null });
  // This fixture exercises TOTP only; the SDK also overloads phone/WebAuthn.
  supabase.auth.mfa.challenge = (async () => ({data: {id:"fixture-challenge", type:"totp" as const, expires_at:9999999999},error:null})) as unknown as typeof supabase.auth.mfa.challenge;
  supabase.auth.mfa.verify = async () => {
    verified = true;
    events.push("verified-existing-factor");
    return { data: { user: fixtureUser, access_token:"fixture-only", refresh_token:"fixture-only", expires_in:3600, token_type:"bearer" }, error:null };
  };
}
const fixtureUser = {
  id: "fixture", email: "user@example.test", aud: "authenticated",
  app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z",
};
supabase.auth.signInWithPassword = async () => ({
  data: { user: fixtureUser, session: {
    user: fixtureUser, access_token: "fixture-only", refresh_token: "fixture-only",
    expires_in: 3600, token_type: "bearer",
  } }, error: null,
});

function Fixture() {
  const [report, setReport] = useState("");
  const pictureRef = useRef<HTMLInputElement>(null);
  const mfa = useProfileMfaState();
  const options = new Proxy({
    email: "user@example.test", password: "FixturePassword1", userEmail: "user@example.test",
    profile: { id: "fixture" }, loadMfaState: mfa.loadMfaState,
    mfaChallengeCodeInput: "123456",
  }, {
    get(target, key) {
      if (key in target) return Reflect.get(target, key);
      return (...args: unknown[]) => {
        events.push(`${String(key)}${typeof args[0] === "boolean" ? `:${args[0]}` : ""}`);
        return key === "loadProfile" ? Promise.resolve(true) : undefined;
      };
    },
  }) as Parameters<typeof useAuthSessionActions>[0];
  const auth = useAuthSessionActions(options);
  const props = new Proxy({
    profile: { id: "fixture", full_name: "Test account", role: new URLSearchParams(location.search).get("role") ?? "Admin" },
    userEmail: "user@example.test", profilePictureInputRef: pictureRef,
    mfaAssurance: { currentLevel: "aal1", nextLevel: "aal2" },
    mfaFactors: [{ id: "old-factor", factor_type: "totp", status: "verified" }],
    mfaEnrollmentRequired: true,
  }, {
    get(target, key) {
      if (key in target) return Reflect.get(target, key);
      return /^(set|handle)/.test(String(key)) ? () => undefined : "";
    },
  }) as ProfileSectionProps;
  return <>
    <button onClick={async () => {
      events.length = 0;
      await auth.handleLogin();
      setReport(events.join(" | "));
    }}>Exercise sign-in</button>
    <output data-testid="auth-result">{report}</output>
    <button onClick={async () => { await auth.handleCompleteMfaChallenge(); setReport(events.join(" | ")); }}>Verify existing factor</button>
    <output data-testid="enrollment-required">{String(mfa.mfaEnrollmentRequired)}</output>
    <ProfileSection {...props} />
  </>;
}

async function render() {
  if (!new URLSearchParams(location.search).has("analytics")) {
    try { await refreshAuthenticationPolicy(); } catch { /* Exercise error during sign-in. */ }
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    new URLSearchParams(location.search).has("analytics") ? <AppointmentAnalyticsPanel /> : <Fixture />
  );
}
void render();
