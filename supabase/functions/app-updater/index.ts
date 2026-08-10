import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildCorsHeaders,
  corsPreflightResponse,
  isCorsOriginAllowed,
  jsonResponse,
} from "../_shared/cors.ts";
import { hasRequiredMfa } from "../_shared/security.ts";

type ParsedVersion = {
  main: [number, number, number];
  prerelease: string[];
};

const parseVersion = (value: string): ParsedVersion | null => {
  const match = value.trim().replace(/^v/i, "").match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return null;

  return {
    main: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
};

const compareVersions = (leftValue: string, rightValue: string) => {
  const left = parseVersion(leftValue);
  const right = parseVersion(rightValue);
  if (!left || !right) throw new Error("The update request contained an invalid version.");

  for (let index = 0; index < left.main.length; index += 1) {
    if (left.main[index] !== right.main[index]) {
      return left.main[index] < right.main[index] ? -1 : 1;
    }
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;

  const maxLength = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) return Number(leftPart) < Number(rightPart) ? -1 : 1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }

  return 0;
};

const noUpdateResponse = (req: Request) =>
  new Response(null, {
    status: 204,
    headers: {
      ...buildCorsHeaders(req),
      "Cache-Control": "no-store",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...buildCorsHeaders(req),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });

  if (!isCorsOriginAllowed(req.headers.get("Origin"))) {
    return jsonResponse(req, { error: "CORS origin is not allowed." }, 403);
  }
  if (req.method !== "GET") return respond({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return respond({ error: "Missing Supabase service configuration." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return respond({ error: "Missing authorization token." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) return respond({ error: "Unauthorized." }, 401);
    if (!hasRequiredMfa(token)) {
      return respond({ error: "Complete MFA verification before checking for updates." }, 403);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return respond({ error: "Your profile was not found." }, 403);
    if (profile.is_active === false) {
      return respond({ error: "Your account has been deactivated." }, 403);
    }

    const requestUrl = new URL(req.url);
    const channel = requestUrl.searchParams.get("channel") === "staging" ? "staging" : "stable";
    const target = requestUrl.searchParams.get("target") ?? "";
    const architecture = requestUrl.searchParams.get("arch") ?? "";
    const currentVersion = requestUrl.searchParams.get("current_version") ?? "";

    if (!["windows", "linux", "darwin"].includes(target)) {
      return respond({ error: "Unsupported update target." }, 400);
    }
    if (!["x86_64", "aarch64", "i686", "armv7"].includes(architecture)) {
      return respond({ error: "Unsupported update architecture." }, 400);
    }
    if (!parseVersion(currentVersion)) {
      return respond({ error: "Invalid installed version." }, 400);
    }

    const { data: release, error: releaseError } = await supabase
      .from("app_releases")
      .select("id, version, release_notes, published_at")
      .eq("channel", channel)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (releaseError) return respond({ error: releaseError.message }, 500);
    if (!release || compareVersions(release.version, currentVersion) <= 0) {
      return noUpdateResponse(req);
    }

    const { data: artifact, error: artifactError } = await supabase
      .from("app_release_artifacts")
      .select("bucket_id, object_path, signature")
      .eq("release_id", release.id)
      .eq("target", target)
      .eq("architecture", architecture)
      .maybeSingle();

    if (artifactError) return respond({ error: artifactError.message }, 500);
    if (!artifact) return respond({ error: "No compatible signed update is available." }, 404);

    const { data: signedDownload, error: signedDownloadError } = await supabase.storage
      .from(artifact.bucket_id)
      .createSignedUrl(artifact.object_path, 10 * 60);

    if (signedDownloadError || !signedDownload?.signedUrl) {
      return respond({ error: "Unable to authorize the private update download." }, 500);
    }

    return respond({
      version: release.version,
      notes: release.release_notes,
      pub_date: release.published_at,
      url: signedDownload.signedUrl,
      signature: artifact.signature,
    });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
