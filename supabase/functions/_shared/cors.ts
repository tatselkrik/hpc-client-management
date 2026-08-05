const DEFAULT_ALLOWED_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
];

function parseAllowedOrigins(value: string | undefined | null) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedCorsOrigins() {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseAllowedOrigins(Deno.env.get("HPC_ALLOWED_CORS_ORIGINS")),
    ...parseAllowedOrigins(Deno.env.get("ALLOWED_CORS_ORIGINS")),
  ]);
}

export function isCorsOriginAllowed(origin: string | null) {
  if (!origin) return true;

  return getAllowedCorsOrigins().has(origin);
}

export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin && isCorsOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function corsPreflightResponse(req: Request) {
  if (!isCorsOriginAllowed(req.headers.get("Origin"))) {
    return new Response("CORS origin is not allowed.", {
      status: 403,
      headers: buildCorsHeaders(req),
    });
  }

  return new Response("ok", { headers: buildCorsHeaders(req) });
}

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}
