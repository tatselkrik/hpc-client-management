import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { corsPreflightResponse, isCorsOriginAllowed, jsonResponse } from "../_shared/cors.ts";
import { validateUploadContent } from "../_shared/uploadContent.ts";
import { hasAuthenticatedSession } from "../_shared/security.ts";

function createServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

const CLIENT_FILE_MAX_BYTES = 25 * 1024 * 1024;
const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024;

const CLIENT_FILE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const CLIENT_FILE_ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
]);

const PROFILE_PICTURE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PROFILE_PICTURE_ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

type UploadContext =
  | "client_document"
  | "client_assessment"
  | "profile_picture"
  | "mobile_document"
  | "mobile_assessment";

type UploadValidationPayload = {
  context?: UploadContext;
  bucket?: string;
  storage_path?: string;
  file_name?: string;
  mime_type?: string | null;
  file_size_bytes?: number;
  client_id?: string;
  mobile_session_id?: string;
  mobile_session_token?: string;
};

type ValidationRule = {
  bucket: "client-documents" | "client-assessments" | "profile-pictures";
  maxBytes: number;
  allowedMimeTypes: Set<string>;
  allowedExtensions: Set<string>;
};

const validationRules: Record<UploadContext, ValidationRule> = {
  client_document: {
    bucket: "client-documents",
    maxBytes: CLIENT_FILE_MAX_BYTES,
    allowedMimeTypes: CLIENT_FILE_ALLOWED_MIME_TYPES,
    allowedExtensions: CLIENT_FILE_ALLOWED_EXTENSIONS,
  },
  client_assessment: {
    bucket: "client-assessments",
    maxBytes: CLIENT_FILE_MAX_BYTES,
    allowedMimeTypes: CLIENT_FILE_ALLOWED_MIME_TYPES,
    allowedExtensions: CLIENT_FILE_ALLOWED_EXTENSIONS,
  },
  profile_picture: {
    bucket: "profile-pictures",
    maxBytes: PROFILE_PICTURE_MAX_BYTES,
    allowedMimeTypes: PROFILE_PICTURE_ALLOWED_MIME_TYPES,
    allowedExtensions: PROFILE_PICTURE_ALLOWED_EXTENSIONS,
  },
  mobile_document: {
    bucket: "client-documents",
    maxBytes: CLIENT_FILE_MAX_BYTES,
    allowedMimeTypes: CLIENT_FILE_ALLOWED_MIME_TYPES,
    allowedExtensions: CLIENT_FILE_ALLOWED_EXTENSIONS,
  },
  mobile_assessment: {
    bucket: "client-assessments",
    maxBytes: CLIENT_FILE_MAX_BYTES,
    allowedMimeTypes: CLIENT_FILE_ALLOWED_MIME_TYPES,
    allowedExtensions: CLIENT_FILE_ALLOWED_EXTENSIONS,
  },
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown) {
  const role = normalizeText(value);
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
  if (normalized === "staff") return "Staff";
  return "";
}

function normalizeRepresentativeName(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getExtension(fileName: string) {
  const match = /\.[a-z0-9]+$/i.exec(fileName.trim());
  return match ? match[0].toLowerCase() : "";
}

function isSafeStoragePath(storagePath: string) {
  return (
    storagePath !== "" &&
    !storagePath.startsWith("/") &&
    !storagePath.includes("\\") &&
    !storagePath.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}

async function getStorageObjectMetadata(
  supabase: ServiceRoleClient,
  bucket: string,
  storagePath: string,
) {
  // Keep the database timestamp text intact: Storage list() truncates it to
  // milliseconds, which cannot pass the proof RPC's exact version comparison.
  const { data, error } = await supabase.rpc("hpc_get_upload_metadata_service", {
    p_bucket: bucket,
    p_path: storagePath,
  });

  if (error) {
    throw new Error(`Storage lookup failed: ${error.message}`);
  }

  const object = data as {
    id?: unknown;
    updated_at?: unknown;
    metadata?: Record<string, unknown> | null;
  } | null;

  if (!object || typeof object.id !== "string" || typeof object.updated_at !== "string") {
    throw new Error("Uploaded file was not found in storage.");
  }

  const metadata = object.metadata as Record<string, unknown> | null | undefined;
  const rawSize = metadata?.size;
  const rawMimeType = metadata?.mimetype ?? metadata?.mimeType ?? metadata?.contentType;

  return {
    objectId: object.id,
    updatedAt: object.updated_at,
    size:
      typeof rawSize === "number" && Number.isFinite(rawSize)
        ? rawSize
        : null,
    mimeType: typeof rawMimeType === "string" ? rawMimeType.trim().toLowerCase() : "",
  };
}

async function removeRejectedUpload(
  supabase: ServiceRoleClient,
  bucket: string,
  storagePath: string,
) {
  if (!bucket || !storagePath) return;

  // Preserve an existing linked record's bytes for administrator review.
  const table = bucket === "profile-pictures" ? "profiles" : bucket === "client-documents" ? "client_documents" : "client_assessments";
  const column = bucket === "profile-pictures" ? "avatar_path" : "storage_path";
  const linked = await supabase.from(table).select("id").eq(column, storagePath).limit(1);
  if (linked.error || linked.data?.length) return;
  await supabase.storage.from(bucket).remove([storagePath]);
}

function validateFileShape({
  rule,
  storagePath,
  fileName,
  mimeType,
  fileSizeBytes,
  storageSize,
  storageMimeType,
}: {
  rule: ValidationRule;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageSize: number | null;
  storageMimeType: string;
}) {
  if (!isSafeStoragePath(storagePath)) {
    return "Invalid storage path.";
  }

  if (!fileName) {
    return "Missing file name.";
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return "Missing or invalid file size.";
  }

  const effectiveSize = storageSize ?? fileSizeBytes;

  if (effectiveSize > rule.maxBytes || fileSizeBytes > rule.maxBytes) {
    return `File is larger than the allowed ${Math.round(rule.maxBytes / (1024 * 1024))} MB limit.`;
  }

  if (storageSize !== null && Math.abs(storageSize - fileSizeBytes) > 1) {
    return "Uploaded file size does not match the saved metadata.";
  }

  const extension = getExtension(storagePath) || getExtension(fileName);
  const namedExtension = getExtension(fileName);
  const sameImageType = [extension, namedExtension].every((value) => value === ".jpg" || value === ".jpeg");
  if (namedExtension !== extension && !sameImageType) return "The file name does not match its stored format.";
  const hasAllowedExtension = rule.allowedExtensions.has(extension);
  const declaredMimeType = mimeType.toLowerCase();
  const effectiveMimeType = storageMimeType || declaredMimeType;
  const hasAllowedMimeType =
    !effectiveMimeType || rule.allowedMimeTypes.has(effectiveMimeType);

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return "Unsupported file type.";
  }

  const mimeByExtension: Record<string, string[]> = {
    ".pdf": ["application/pdf"], ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"],
    ".png": ["image/png"], ".webp": ["image/webp"], ".txt": ["text/plain"],
    ".csv": ["text/csv", "text/plain", "application/vnd.ms-excel"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  };
  const expectedMime = mimeByExtension[extension];
  if (!expectedMime || (effectiveMimeType && !expectedMime.includes(effectiveMimeType)) ||
      (declaredMimeType && !expectedMime.includes(declaredMimeType))) return "The file extension and MIME type do not agree.";

  return "";
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validateDesktopCaller({
  supabase,
  token,
  context,
  clientId,
  storagePath,
}: {
  supabase: ServiceRoleClient;
  token: string;
  context: UploadContext;
  clientId: string;
  storagePath: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { error: "Unauthorized.", status: 401, user: null, profile: null };
  }

  if (!hasAuthenticatedSession(token)) {
    return {
      error: "Sign in before uploading files.",
      status: 403,
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, hpc_representative_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, status: 500, user: null, profile: null };
  }

  if (!profile) {
    return { error: "Your profile was not found.", status: 403, user: null, profile: null };
  }

  if (profile.is_active === false) {
    return {
      error: "Your account is inactive. Please contact an administrator.",
      status: 403,
      user: null,
      profile: null,
    };
  }

  if (context === "profile_picture") {
    if (!storagePath.startsWith(`${user.id}/`)) {
      // Existing roster photos can be verified on first access after upgrading.
      // A caller cannot use this exception to approve a new path for another user.
      const existing = await supabase.from("profiles").select("id").eq("avatar_path", storagePath).eq("is_active", true).maybeSingle();
      if (!existing.error && existing.data) return { error: "", status: 200, user, profile };
      return {
        error: "Profile picture uploads must be stored in your own profile folder.",
        status: 403,
        user: null,
        profile: null,
      };
    }

    return { error: "", status: 200, user, profile };
  }

  if (!clientId) {
    return { error: "Missing client ID.", status: 400, user: null, profile: null };
  }

  if (!storagePath.startsWith(`${clientId}/`)) {
    return {
      error: "Client files must be stored inside the selected client folder.",
      status: 400,
      user: null,
      profile: null,
    };
  }

  const role = normalizeRole(profile.role);

  if (role !== "Admin" && role !== "Psychologist / Counselor" && role !== "Staff") {
    return {
      error: "Your role cannot upload client files.",
      status: 403,
      user: null,
      profile: null,
    };
  }

  if (role === "Psychologist / Counselor") {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, hpc_representative")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError) {
      return { error: clientError.message, status: 500, user: null, profile: null };
    }

    if (!client) {
      return { error: "Client was not found.", status: 404, user: null, profile: null };
    }

    const assignedRepresentative = normalizeRepresentativeName(
      profile.hpc_representative_name,
    );
    const clientRepresentative = normalizeRepresentativeName(client.hpc_representative);

    if (!assignedRepresentative || assignedRepresentative !== clientRepresentative) {
      return {
        error: "This client is not assigned to your HPC Representative profile.",
        status: 403,
        user: null,
        profile: null,
      };
    }
  }

  return { error: "", status: 200, user, profile };
}

async function validateMobileSession({
  supabase,
  payload,
  context,
  storagePath,
}: {
  supabase: ServiceRoleClient;
  payload: UploadValidationPayload;
  context: UploadContext;
  storagePath: string;
}) {
  const sessionId = normalizeText(payload.mobile_session_id);
  const sessionToken = normalizeText(payload.mobile_session_token);

  if (!sessionId || !sessionToken) {
    return { error: "Missing mobile upload session credentials.", status: 401, session: null };
  }

  const tokenHash = await sha256Hex(sessionToken);
  const { data: session, error } = await supabase
    .from("mobile_upload_sessions")
    .select("id, token_hash, client_id, target_type, created_by, status, expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 500, session: null };
  }

  if (!session || session.token_hash !== tokenHash) {
    return { error: "Mobile upload session was not found.", status: 404, session: null };
  }

  if (session.status !== "pending" && session.status !== "uploaded") {
    return { error: "Mobile upload session is no longer accepting files.", status: 409, session: null };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await supabase
      .from("mobile_upload_sessions")
      .update({ status: "expired" })
      .eq("id", session.id);
    return { error: "Mobile upload session has expired.", status: 410, session: null };
  }

  const expectedTarget = context === "mobile_document" ? "document" : "assessment";

  if (session.target_type !== expectedTarget) {
    return { error: "Mobile upload target type does not match this session.", status: 400, session: null };
  }

  if (!storagePath.startsWith(`${session.client_id}/`)) {
    return { error: "Mobile upload path does not match the session client.", status: 400, session: null };
  }

  return { error: "", status: 200, session };
}

async function completeMobileUpload({
  supabase,
  session,
  context,
  storagePath,
  fileName,
  mimeType,
  fileSizeBytes,
}: {
  supabase: ServiceRoleClient;
  session: Record<string, string | null>;
  context: UploadContext;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number;
}) {
  const isDocument = context === "mobile_document";
  const table = isDocument ? "client_documents" : "client_assessments";
  const nameColumn = isDocument ? "document_name" : "assessment_name";

  const { data: insertedRecord, error: insertError } = await supabase
    .from(table)
    .insert({
      client_id: session.client_id,
      [nameColumn]: fileName,
      original_file_name: fileName,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      created_by: session.created_by,
    })
    .select("id")
    .single();

  if (insertError) {
    await removeRejectedUpload(
      supabase,
      validationRules[context].bucket,
      storagePath,
    );
    return { error: insertError.message, status: 500 };
  }

  const { error: sessionUpdateError } = await supabase
    .from("mobile_upload_sessions")
    .update({
      status: "completed",
      storage_path: storagePath,
      uploaded_file_name: fileName,
    })
    .eq("id", session.id);

  if (sessionUpdateError) {
    return { error: sessionUpdateError.message, status: 500 };
  }

  return {
    error: "",
    status: 200,
    record_id:
      typeof insertedRecord?.id === "string" ? insertedRecord.id : null,
  };
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

  const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  const payload = (await req.json().catch(() => ({}))) as UploadValidationPayload;
  const context = payload.context;
  const rule = context ? validationRules[context] : null;
  const bucket = normalizeText(payload.bucket);
  const storagePath = normalizeText(payload.storage_path);
  const fileName = normalizeText(payload.file_name);
  const mimeType = normalizeText(payload.mime_type).toLowerCase();
  const fileSizeBytes = Number(payload.file_size_bytes);
  const isMobileContext = context === "mobile_document" || context === "mobile_assessment";
  const mobileUploadEnabled =
    (Deno.env.get("MOBILE_UPLOAD_ENABLED") ?? "").trim().toLowerCase() === "true";

  if (!context || !rule) {
    return respond({ error: "Unsupported upload validation context." }, 400);
  }

  if (isMobileContext && !mobileUploadEnabled) {
    return respond({ error: "Upload from Phone is disabled in this release." }, 503);
  }

  if (bucket !== rule.bucket) {
    return respond({ error: "Upload bucket does not match the requested file type." }, 400);
  }

  let session: Record<string, string | null> | null = null;
  let callerMayDeleteUpload = false;

  try {
    if (isMobileContext) {
      const mobileCheck = await validateMobileSession({
        supabase,
        payload,
        context,
        storagePath,
      });

      if (mobileCheck.error) {
        return respond({ error: mobileCheck.error }, mobileCheck.status);
      }

      session = mobileCheck.session as Record<string, string | null>;
      callerMayDeleteUpload = true;
    } else {
      const authorization = req.headers.get("Authorization") ?? "";
      const token = authorization.replace(/^Bearer\s+/i, "").trim();

      if (!token) {
        return respond({ error: "Missing authorization token." }, 401);
      }

      const callerCheck = await validateDesktopCaller({
        supabase,
        token,
        context,
        clientId: normalizeText(payload.client_id),
        storagePath,
      });

      if (callerCheck.error) {
        return respond({ error: callerCheck.error }, callerCheck.status);
      }

      callerMayDeleteUpload = context !== "profile_picture" || storagePath.startsWith(`${callerCheck.user?.id}/`);
    }

    const storageMetadata = await getStorageObjectMetadata(
      supabase,
      bucket,
      storagePath,
    );
    const validationMessage = validateFileShape({
      rule,
      storagePath,
      fileName,
      mimeType,
      fileSizeBytes: fileSizeBytes > 0 ? fileSizeBytes : storageMetadata.size ?? 0,
      storageSize: storageMetadata.size,
      storageMimeType: storageMetadata.mimeType,
    });

    if (validationMessage) {
      if (callerMayDeleteUpload) await removeRejectedUpload(supabase, bucket, storagePath);
      return respond({ error: validationMessage }, 400);
    }

    const downloaded = await supabase.storage.from(bucket).download(storagePath);
    if (downloaded.error || !downloaded.data) throw new Error("The uploaded bytes could not be checked.");
    if (downloaded.data.size <= 0 || downloaded.data.size > rule.maxBytes || (storageMetadata.size !== null && downloaded.data.size !== storageMetadata.size)) throw new Error("The uploaded file exceeds the limit or changed during validation.");
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    const contentError = validateUploadContent(bytes, fileName);
    if (contentError) {
      if (callerMayDeleteUpload) await removeRejectedUpload(supabase, bucket, storagePath);
      return respond({ error: contentError }, 400);
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2,"0")).join("");
    const proof = await supabase.rpc("hpc_verify_upload_service", {
      p_bucket: bucket, p_path: storagePath, p_sha256: sha256,
      p_object_id: storageMetadata.objectId, p_updated_at: storageMetadata.updatedAt,
    });
    if (proof.error) throw new Error("The file changed or its validation proof could not be stored. Please retry.");

    if (isMobileContext && session) {
      const completion = await completeMobileUpload({
        supabase,
        session,
        context,
        storagePath,
        fileName,
        mimeType: mimeType || storageMetadata.mimeType || null,
        fileSizeBytes,
      });

      if (completion.error) {
        return respond({ error: completion.error }, completion.status);
      }

      return respond({
        ok: true,
        record_id: completion.record_id,
        storage_path: storagePath,
      });
    }

    return respond({
      ok: true,
      storage_path: storagePath,
    });
  } catch (error) {
    if (callerMayDeleteUpload) {
      await removeRejectedUpload(supabase, bucket, storagePath);
    }
    const message = error instanceof Error ? error.message : String(error);

    return respond({ error: message }, 500);
  }
});
