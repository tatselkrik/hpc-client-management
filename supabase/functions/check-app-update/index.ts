import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { hasRequiredMfa } from "../_shared/security.ts";

type UpdateCheckPayload = {
  channel?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const respond = (body: Record<string, unknown>, status = 200) =>
    jsonResponse(req, body, status);

  if (!isCorsOriginAllowed(req.headers.get("Origin"))) {
    return respond({ error: "CORS origin is not allowed." }, 403);
  }

  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);

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

    const payload = (await req.json().catch(() => ({}))) as UpdateCheckPayload;
    const channel = payload.channel === "staging" ? "staging" : "stable";

    const { data: release, error: releaseError } = await supabase
      .from("app_releases")
      .select("version, release_notes, download_url, published_at")
      .eq("channel", channel)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (releaseError) return respond({ error: releaseError.message }, 500);
    if (!release) return respond({ error: `No ${channel} release is configured.` }, 404);

    const downloadUrl =
      typeof release.download_url === "string" && /^https:\/\//i.test(release.download_url)
        ? release.download_url
        : null;

    return respond({
      ok: true,
      channel,
      version: release.version,
      notes: release.release_notes,
      download_url: downloadUrl,
      published_at: release.published_at,
    });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
