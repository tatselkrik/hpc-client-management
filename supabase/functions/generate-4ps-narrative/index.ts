import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { hasRequiredMfa } from "../_shared/security.ts";


const allowedRoles = new Set([
  "Admin",
  "Psychologist / Counselor",
]);

const narrativePromptVersion = "4ps-narrative-v3";

const fourPsRows = [
  ["predisposing", "PREDISPOSING"],
  ["precipitating", "PRECIPITATING"],
  ["perpetuating", "PERPETUATING"],
  ["protective", "PROTECTIVE"],
] as const;

const fourPsFactors = [
  ["biological", "Biological"],
  ["psychological", "Psychological"],
  ["social", "Social"],
] as const;

type FourPsPayload = Record<string, Record<string, unknown>>;

type GeneratePayload = {
  client_id?: string;
  four_ps?: FourPsPayload;
  prompt_version?: string;
};


function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeRole(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();

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

  return normalized ? normalizeText(value) : "";
}

function normalizeRepresentativeName(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function formatFourPsForPrompt(fourPs: FourPsPayload) {
  const lines: string[] = [];

  for (const [rowKey, rowLabel] of fourPsRows) {
    lines.push(`${rowLabel}`);

    for (const [factorKey, factorLabel] of fourPsFactors) {
      const value = normalizeText(fourPs?.[rowKey]?.[factorKey]);
      lines.push(`${factorLabel}: ${value || "Not provided"}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildPrompt(fourPsText: string) {
  return `You are assisting a clinician at a psychological clinic with drafting a case conceptualization narrative.

Generate only the Narrative Report section from the provided 4Ps case conceptualization table.

Privacy and safety rules:
- Do not use or infer the client's actual name.
- Refer to the person only as "the client".
- Do not include addresses, phone numbers, school names, workplace names, family names, or other identifying details.
- Do not invent facts, diagnoses, incidents, symptoms, or treatment recommendations.
- Do not include a treatment plan.
- Do not make definitive medical or legal conclusions.
- Use careful clinical wording such as "may", "appears", "suggests", or "may be associated with" when appropriate.
- The report must be a draft for clinician review.

Writing style:
- Professional, clear, and suitable for a counseling case file.
- Use paragraph form, not bullets.
- Do not include any heading, title, markdown, label, or line that says "Narrative Report".
- Start directly with the first paragraph of the report.
- Integrate Biological, Psychological, and Social factors across Predisposing, Precipitating, Perpetuating, and Protective areas.
- Mention strengths and supports when protective factors are provided.
- Keep the report concise but complete, around 4 to 6 paragraphs.
- Check the draft for grammar and ensure every paragraph, including the final sentence, is complete before returning it.

4Ps table:
${fourPsText}`;
}

function extractGeminiText(responseBody: Record<string, unknown>) {
  const candidates = responseBody.candidates;

  if (!Array.isArray(candidates)) return "";

  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = content?.parts;

  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => {
      const text = (part as Record<string, unknown>)?.text;
      return typeof text === "string" ? text : "";
    })
    .join("")
    .trim();
}

function extractGeminiFinishReason(responseBody: Record<string, unknown>) {
  const candidates = responseBody.candidates;

  if (!Array.isArray(candidates)) return "";

  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  return typeof firstCandidate?.finishReason === "string"
    ? firstCandidate.finishReason
    : "";
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

    if (!supabaseUrl || !serviceRoleKey) {
      return respond({ error: "Missing Supabase service configuration." }, 500);
    }

    if (!geminiApiKey) {
      return respond({ error: "Missing GEMINI_API_KEY Supabase secret." }, 500);
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

    if (!hasRequiredMfa(token)) {
      return respond({ error: "Complete MFA verification before generating a narrative." }, 403);
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

    if (!allowedRoles.has(callerRole)) {
      return respond({ error: "Your role cannot generate narrative reports." }, 403);
    }

    const payload = (await req.json().catch(() => ({}))) as GeneratePayload;
    const clientId = normalizeText(payload.client_id);

    if (!clientId) {
      return respond({ error: "Missing client ID." }, 400);
    }

    const { data: clientRecord, error: clientRecordError } = await supabase
      .from("clients")
      .select("id, hpc_representative")
      .eq("id", clientId)
      .maybeSingle();

    if (clientRecordError) {
      return respond({ error: `Client access check failed: ${clientRecordError.message}` }, 500);
    }

    if (!clientRecord) {
      return respond({ error: "Client was not found." }, 404);
    }

    if (callerRole === "Psychologist / Counselor") {
      const assignedRepresentative = normalizeRepresentativeName(
        callerProfile.hpc_representative_name,
      );
      const clientRepresentative = normalizeRepresentativeName(clientRecord.hpc_representative);

      if (!assignedRepresentative || assignedRepresentative !== clientRepresentative) {
        return respond(
          { error: "This client is not assigned to your HPC Representative profile." },
          403,
        );
      }
    }

    const fourPs = payload.four_ps ?? {};

    const missingRequiredRows = fourPsRows
      .filter(([rowKey]) =>
        fourPsFactors.every(([factorKey]) => !normalizeText(fourPs?.[rowKey]?.[factorKey])),
      )
      .map(([, rowLabel]) => rowLabel);

    if (missingRequiredRows.length > 0) {
      return respond(
        {
          error: `Add at least one 4Ps field for ${missingRequiredRows.join(", ")} before generating a narrative report.`,
        },
        400,
      );
    }

    const promptVersion = narrativePromptVersion;
    const fourPsText = formatFourPsForPrompt(fourPs);
    const prompt = buildPrompt(fourPsText);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            thinkingConfig: {
              thinkingLevel: "low",
            },
            maxOutputTokens: 3200,
          },
        }),
      },
    );

    const responseBody = (await geminiResponse.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!geminiResponse.ok) {
      const errorObject = responseBody.error as Record<string, unknown> | undefined;
      const message =
        typeof errorObject?.message === "string"
          ? errorObject.message
          : `Gemini request failed with status ${geminiResponse.status}.`;

      return respond({ error: message }, 502);
    }

    const finishReason = extractGeminiFinishReason(responseBody);

    if (finishReason && finishReason !== "STOP") {
      return respond(
        {
          error: `Gemini stopped before completing the narrative (${finishReason}). Please generate it again.`,
        },
        502,
      );
    }

    const narrativeReport = extractGeminiText(responseBody)
      .replace(/^#{1,6}\s*Narrative Report\s*\n+/i, "")
      .replace(/^\*\*Narrative Report\*\*\s*\n+/i, "")
      .replace(/^Narrative Report\s*\n+/i, "")
      .trim();

    if (!narrativeReport) {
      return respond({ error: "Gemini returned an empty narrative report." }, 502);
    }

    if (!/[.!?]["')\]]?$/.test(narrativeReport)) {
      return respond(
        { error: "Gemini returned an incomplete narrative draft. Please generate it again." },
        502,
      );
    }

    await supabase.from("audit_logs").insert({
      actor_user_id: caller.id,
      actor_email: caller.email ?? callerProfile.email ?? null,
      actor_name: callerProfile.full_name ?? null,
      module: "Clients",
      action: "Generated 4Ps Narrative Report",
      target_type: "client",
      target_id: clientId,
      target_label: "4Ps Narrative Report",
      details: {
        provider: "Gemini",
        model: geminiModel,
        prompt_version: promptVersion,
        sent_fields_only: "4Ps table values",
        privacy_note: "Client name and identifying fields are not sent by the app.",
      },
    });

    return respond({
      ok: true,
      narrative_report: narrativeReport,
      generated_at: new Date().toISOString(),
      prompt_version: promptVersion,
      model: geminiModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return respond({ error: message }, 500);
  }
});
