import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { requireFreshMfaSession } from "../_shared/security.ts";

const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const MAX_RESTORE_ROWS = 100_000;
const RESTORABLE_TABLES = new Set([
  "client_categories",
  "clinic_settings",
  "clients",
  "client_children",
  "client_4ps",
  "client_cssrs",
  "progress_notes",
  "client_documents",
  "client_assessments",
  "dashboard_announcements",
]);

type BackupPayload = {
  format_version?: unknown;
  source_project_ref?: unknown;
  tables?: Record<string, unknown>;
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
    const contentLength = Number(req.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return respond({ error: "The restore package is too large." }, 413);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return respond({ error: "Missing Supabase service configuration." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) return respond({ error: "Missing authorization token." }, 401);

    const freshMfaError = requireFreshMfaSession(token);
    if (freshMfaError) return respond({ error: freshMfaError }, 403);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) return respond({ error: "Unauthorized." }, 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return respond({ error: "Your profile was not found." }, 403);
    if (profile.is_active === false) {
      return respond({ error: "Your account has been deactivated." }, 403);
    }
    if (String(profile.role).trim().toLowerCase() !== "admin") {
      return respond({ error: "Only an Admin can restore a clinic backup." }, 403);
    }

    const backup = (await req.json().catch(() => null)) as BackupPayload | null;
    if (!backup || typeof backup !== "object") {
      return respond({ error: "The restore package is not valid JSON." }, 400);
    }
    if (backup.format_version !== 2) {
      return respond({ error: "This backup format is not supported." }, 400);
    }
    if (!backup.tables || typeof backup.tables !== "object") {
      return respond({ error: "The restore package does not contain clinic tables." }, 400);
    }

    const currentProjectRef = new URL(supabaseUrl).hostname.split(".")[0];
    if (backup.source_project_ref !== currentProjectRef) {
      return respond(
        { error: "This backup belongs to a different Supabase project and cannot be restored here." },
        400,
      );
    }

    let rowCount = 0;
    for (const [tableName, rows] of Object.entries(backup.tables)) {
      if (!RESTORABLE_TABLES.has(tableName) && tableName !== "profiles") {
        return respond({ error: `The restore package contains an unsupported table: ${tableName}.` }, 400);
      }
      if (!Array.isArray(rows)) {
        return respond({ error: `Backup table ${tableName} must contain a list of records.` }, 400);
      }
      rowCount += rows.length;
    }

    if (rowCount > MAX_RESTORE_ROWS) {
      return respond({ error: "The restore package contains too many records." }, 413);
    }

    const { data: restoreResult, error: restoreError } = await supabase.rpc(
      "hpc_restore_backup_service",
      {
        p_backup: backup,
        p_actor_user_id: user.id,
      },
    );

    if (restoreError) return respond({ error: restoreError.message }, 400);

    return respond({ ok: true, result: restoreResult });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
