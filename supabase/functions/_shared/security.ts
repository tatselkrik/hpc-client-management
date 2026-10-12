type JwtClaims = {
  aal?: string;
  sub?: string;
  role?: string;
  is_anonymous?: boolean;
  amr?: Array<{
    method?: string;
    timestamp?: number;
  }>;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function readValidatedJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as JwtClaims;
  } catch {
    return null;
  }
}

// Call only after auth.getUser(token) has validated the token. Token refresh does
// not count as reauthentication; use the password AMR timestamp, never iat.
export function requireFreshPasswordSession(token: string, maxAgeSeconds = 5 * 60) {
  const claims = readValidatedJwtClaims(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!hasAuthenticatedSession(token)) {
    return "Sign in before performing this administrative action.";
  }

  const latestPasswordVerification = Math.max(
    ...((claims?.amr ?? [])
      .filter((entry) => entry.method === "password")
      .map((entry) => entry.timestamp ?? 0)),
    0,
  );

  if (
    !latestPasswordVerification ||
    nowSeconds - latestPasswordVerification > maxAgeSeconds ||
    latestPasswordVerification > nowSeconds + 60
  ) {
    return "Please sign in again with your password before performing this administrative action.";
  }

  return null;
}

export function hasAuthenticatedSession(token: string) {
  const claims = readValidatedJwtClaims(token);
  return Boolean(claims?.sub && claims.role === "authenticated" &&
    claims.is_anonymous !== true && ["aal1", "aal2"].includes(claims.aal ?? ""));
}
