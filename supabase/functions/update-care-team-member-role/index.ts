import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { requireFreshPasswordSession } from "../_shared/security.ts";


const roleOptions = new Set([
  "Admin",
  "Psychologist / Counselor",
  "Staff",
]);

function roleRequiresRepresentative(role: string) {
  return role === "Admin" || role === "Psychologist / Counselor";
}


function normalizeRole(value: unknown) {
  const role = typeof value === "string" ? value.trim() : "";

  if (roleOptions.has(role)) return role;

  const normalized = role.toLowerCase();

  if (normalized === "ceo" || normalized === "chief executive officer") return "Admin";
  if (normalized.includes("admin")) return "Admin";
  if (
    normalized === "psychologist / counselor" ||
    normalized === "psychologist / counsellor" ||
    normalized === "psychologist" ||
    normalized === "counselor" ||
    normalized === "counsellor"
  ) {
    return "Psychologist / Counselor";
  }
  if (normalized === "staff") return "Staff";
  return "";
}

function normalizeHpcRepresentativeName(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (normalized.toLowerCase() === "ms. june") {
    return "Ms June";
  }

  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  const respond = (body: Record<string, unknown>, status = 200) =>
    jsonResponse(req, body, status);

  if (!isCorsOriginAllowed(req.headers.get("Origin"))) {
    return respond({ error: "CORS origin is not allowed." }, 403);
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return respond({ error: "Missing Supabase service configuration." }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return respond({ error: "Missing authorization token." }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return respond({ error: "Unauthorized." }, 401);
  }

  const freshSessionError = requireFreshPasswordSession(token);
  if (freshSessionError) {
    return respond({ error: freshSessionError }, 403);
  }

  const payload = await req.json().catch(() => ({}));
  const { target_profile_id, role } = payload;
  const targetProfileId =
    typeof target_profile_id === "string" ? target_profile_id.trim() : "";
  const nextRole = normalizeRole(role);
  const nextHpcRepresentativeName =
    roleRequiresRepresentative(nextRole)
      ? normalizeHpcRepresentativeName(
          payload.hpc_representative_name ?? payload.hpcRepresentativeName,
        )
      : "";

  if (!targetProfileId) {
    return respond({ error: "target_profile_id is required." }, 400);
  }

  if (!roleOptions.has(nextRole)) {
    return respond({ error: "Select a supported care team role." }, 400);
  }

  if (roleRequiresRepresentative(nextRole) && !nextHpcRepresentativeName) {
    return respond(
      { error: "HPC Representative is required for Admin and Psychologist / Counselor accounts." },
      400,
    );
  }

  if (targetProfileId === user.id) {
    return respond({ error: "You cannot change your own role." }, 400);
  }

  const { data: callerProfile, error: callerProfileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (callerProfileError) {
    return respond({ error: callerProfileError.message }, 500);
  }

  if (callerProfile?.is_active === false) {
    return respond({ error: "Your account is inactive. Please contact an administrator." }, 403);
  }

  const callerRole = normalizeRole(callerProfile?.role);

  if (callerRole !== "Admin" && callerRole !== "Staff") {
    return respond({ error: "Only Admin or Staff accounts can update care team roles." }, 403);
  }

  const { data: targetProfileBefore, error: targetProfileBeforeError } = await supabase
    .from("profiles")
    .select("id, full_name, role, email, hpc_representative_name, is_active")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (targetProfileBeforeError) {
    return respond({ error: targetProfileBeforeError.message }, 500);
  }

  if (!targetProfileBefore) {
    return respond({ error: "Care team member was not found." }, 404);
  }

  const previousRole = normalizeRole(targetProfileBefore.role);

  if (callerRole === "Staff" && (previousRole === "Admin" || nextRole === "Admin")) {
    return respond({ error: "Staff accounts cannot create, edit, or affect Admin accounts." }, 403);
  }

  if (targetProfileBefore.is_active === false) {
    return respond({ error: "This care team account is inactive." }, 409);
  }
  const { data: updatedProfile, error: updateError } = await supabase.rpc("hpc_manage_team_service", {
    p_actor_id: user.id, p_target_id: targetProfileId, p_action: "role",
    p_role: nextRole, p_representative: roleRequiresRepresentative(nextRole) ? nextHpcRepresentativeName || null : null,
  });
  if (updateError || !updatedProfile) return respond({ error: updateError?.message ?? "The account was not updated." }, 409);

  return respond({ profile: updatedProfile, audit_log_written: true });
});
