import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before starting the app."
  );
}

// Clinical workstations require a fresh sign-in after the app closes. Remove
// tokens left by older releases; new access/refresh tokens stay in memory.
if (typeof window !== "undefined") {
  const legacyKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  try {
    window.localStorage.removeItem(legacyKey);
    window.localStorage.removeItem(`${legacyKey}-code-verifier`);
    window.localStorage.removeItem(`${legacyKey}-user`);
  } catch { /* Storage may be unavailable; it is never used for new sessions. */ }
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true },
});
