import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { requireFreshMfaSession } from "../_shared/security.ts";


const roleOptions = new Set([
  "Admin",
  "Psychologist / Counselor",
  "Staff",
]);

function roleRequiresRepresentative(role: string) {
  return role === "Admin" || role === "Psychologist / Counselor";
}

type InvitePayload = {
  email?: string;
  full_name?: string;
  fullName?: string;
  role?: string;
  hpc_representative_name?: string;
  hpcRepresentativeName?: string;
};


function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function normalizeRepresentativeName(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const inviteRedirectUrl = Deno.env.get("CARE_TEAM_INVITE_REDIRECT_URL")?.trim();

    if (!supabaseUrl || !serviceRoleKey || !inviteRedirectUrl) {
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
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(token);

    if (callerError || !caller) {
      return respond({ error: "Unauthorized." }, 401);
    }

    const freshSessionError = requireFreshMfaSession(token);
    if (freshSessionError) {
      return respond({ error: freshSessionError }, 403);
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, hpc_representative_name, is_active")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return respond({ error: "Your profile was not found." }, 403);
    }

    if (callerProfile.is_active === false) {
      return respond({ error: "Your account is inactive. Please contact an administrator." }, 403);
    }

    const callerRole = normalizeRole(callerProfile.role);

    if (callerRole !== "Admin" && callerRole !== "Staff") {
      return respond({ error: "Only Admin or Staff accounts can invite care team members." }, 403);
    }

    const payload = (await req.json().catch(() => ({}))) as InvitePayload;
    const email = payload.email?.trim().toLowerCase() ?? "";
    const fullName = (payload.full_name ?? payload.fullName ?? "").trim();
    const role = normalizeRole(payload.role);
    const hpcRepresentativeName =
      roleRequiresRepresentative(role)
        ? normalizeRepresentativeName(
            payload.hpc_representative_name ?? payload.hpcRepresentativeName,
          )
        : null;

    if (!email || !isValidEmail(email)) {
      return respond({ error: "Valid email is required." }, 400);
    }

    if (!fullName) {
      return respond({ error: "Full name is required." }, 400);
    }

    if (!roleOptions.has(role)) {
      return respond({ error: "Select a supported care team role." }, 400);
    }

    if (callerRole === "Staff" && role === "Admin") {
      return respond({ error: "Staff accounts cannot create Admin accounts." }, 403);
    }

    if (roleRequiresRepresentative(role) && !hpcRepresentativeName) {
      return respond(
        { error: "HPC Representative is required for Admin and Psychologist / Counselor accounts." },
        400,
      );
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfileError) {
      return respond({ error: existingProfileError.message }, 400);
    }

    if (existingProfile?.id) {
      return respond(
        { error: "A care team profile with this email already exists." },
        409,
      );
    }

    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
        },
        redirectTo: inviteRedirectUrl,
      });

    if (createUserError || !createdUser.user) {
      return respond(
        { error: createUserError?.message || "Could not create auth user." },
        400,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: createdUser.user.id,
          email,
          full_name: fullName,
          role,
          hpc_representative_name: hpcRepresentativeName,
          is_active: true,
        },
        { onConflict: "id" },
      )
      .select("id, email, full_name, role, hpc_representative_name, is_active")
      .single();

    if (profileError) {
      // The Auth trigger creates new profiles as inactive. If activation fails,
      // retain that inactive account for review instead of permanently deleting it.
      await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", createdUser.user.id);

      return respond(
        { error: `${profileError.message} The invited account was retained as inactive.` },
        400,
      );
    }

    await supabase.from("audit_logs").insert({
      actor_user_id: caller.id,
      actor_email: caller.email ?? callerProfile.email ?? null,
      actor_name: callerProfile.full_name ?? null,
      module: "Care Team",
      action: "Invited Member Account",
      target_type: "profile",
      target_id: createdUser.user.id,
      target_label: fullName,
      details: {
        email,
        role,
        hpc_representative_name: hpcRepresentativeName,
        delivery: "email_invitation_required_password_setup",
        mfa_required: true,
      },
    });

    return respond({
      ok: true,
      userId: createdUser.user.id,
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return respond({ error: message }, 500);
  }
});
