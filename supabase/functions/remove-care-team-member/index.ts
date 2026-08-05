import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";



function normalizeRole(value: unknown) {
  const role = typeof value === "string" ? value.trim() : "";
  const normalized = role.toLowerCase();

  if (normalized === "ceo" || normalized === "chief executive officer") return "CEO";
  if (normalized.includes("admin")) return "Admin";

  return role;
}

async function deleteAuthUserAndProfile(
  supabase: ReturnType<typeof createClient>,
  targetProfileId: string,
) {
  const firstDelete = await supabase.auth.admin.deleteUser(targetProfileId, false);

  if (!firstDelete.error) {
    await supabase.from("profiles").delete().eq("id", targetProfileId);
    return null;
  }

  const profileDelete = await supabase
    .from("profiles")
    .delete()
    .eq("id", targetProfileId);

  if (profileDelete.error) {
    return profileDelete.error;
  }

  const retryDelete = await supabase.auth.admin.deleteUser(targetProfileId, false);

  if (retryDelete.error && !/not found/i.test(retryDelete.error.message)) {
    return retryDelete.error;
  }

  return null;
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

  const { target_profile_id } = await req.json().catch(() => ({}));
  const targetProfileId =
    typeof target_profile_id === "string" ? target_profile_id.trim() : "";

  if (!targetProfileId) {
    return respond({ error: "target_profile_id is required." }, 400);
  }

  if (targetProfileId === user.id) {
    return respond({ error: "You cannot remove your own account." }, 400);
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

  if (callerRole !== "Admin" && callerRole !== "CEO") {
    return respond({ error: "Only Admin or CEO accounts can remove care team members." }, 403);
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_path, role, hpc_representative_name, is_active")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (targetProfileError) {
    return respond({ error: targetProfileError.message }, 500);
  }

  if (!targetProfile) {
    return respond({ error: "Care team member was not found." }, 404);
  }

  const targetRole = normalizeRole(targetProfile.role);

  if (callerRole === "CEO" && targetRole === "Admin") {
    return respond({ error: "CEO accounts cannot remove Admin members." }, 403);
  }

  const deleteError = await deleteAuthUserAndProfile(supabase, targetProfileId);

  if (deleteError) {
    return respond({ error: deleteError.message }, 500);
  }

  if (targetProfile.avatar_path) {
    await supabase.storage
      .from("profile-pictures")
      .remove([targetProfile.avatar_path]);
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email ?? callerProfile?.email ?? null,
    actor_name: callerProfile?.full_name ?? null,
    module: "Care Team",
    action: "Removed Member Account",
    target_type: "profile",
    target_id: targetProfileId,
    target_label: targetProfile.full_name ?? targetProfile.email ?? targetProfileId,
    details: {
      email: targetProfile.email ?? null,
      previous_role: targetRole,
      previous_hpc_representative_name: targetProfile.hpc_representative_name ?? null,
      target_was_active: targetProfile.is_active ?? true,
      permanent: true,
      source: "edge_function",
    },
  });

  return respond({
    removed_profile_id: targetProfileId,
    removed_name: targetProfile.full_name ?? null,
    removed_email: targetProfile.email ?? null,
    audit_log_written: true,
  });
});
