type JwtClaims = {
  aal?: string;
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

export function requireFreshMfaSession(token: string, maxAgeSeconds = 5 * 60) {
  const claims = readValidatedJwtClaims(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (claims?.aal !== "aal2") {
    return "Complete MFA verification before performing this administrative action.";
  }

  const latestMfaVerification = Math.max(
    ...((claims.amr ?? [])
      .filter((entry) => entry.method === "totp" || entry.method === "otp")
      .map((entry) => entry.timestamp ?? 0)),
    0,
  );

  if (
    !latestMfaVerification ||
    nowSeconds - latestMfaVerification > maxAgeSeconds ||
    latestMfaVerification > nowSeconds + 60
  ) {
    return "Please sign in again and complete MFA before performing this administrative action.";
  }

  return null;
}

export function hasRequiredMfa(token: string) {
  return readValidatedJwtClaims(token)?.aal === "aal2";
}
