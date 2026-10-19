import { supabase } from "./supabase";
import { getSupabaseFunctionErrorMessage } from "./supabaseFunctionErrors";

export type UploadValidationContext =
  | "client_document"
  | "client_assessment"
  | "profile_picture";

export type UploadValidationPayload = {
  context: UploadValidationContext;
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number;
  client_id?: string;
};

type UploadValidationResponse = {
  ok?: boolean;
  error?: string;
};

export async function validateStoredUploadOnServer(
  payload: UploadValidationPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke<UploadValidationResponse>(
    "validate-upload",
    {
      body: payload,
    }
  );

  if (error) {
    const message = await getSupabaseFunctionErrorMessage(error);
    return {
      ok: false,
      message:
        message ||
        "Server-side upload validation is unavailable. The uploaded file was not saved.",
    };
  }

  if (data?.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    message:
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : "Server-side upload validation rejected this file.",
  };
}

export async function createVerifiedClientFileUrl(
  bucket: string,
  file: { client_id: string; storage_path: string; original_file_name: string | null; mime_type: string | null; file_size_bytes: number | null },
  context: "client_document" | "client_assessment",
) {
  let result = await supabase.storage.from(bucket).createSignedUrl(file.storage_path, 60 * 60);
  if (result.error) {
    const checked = await validateStoredUploadOnServer({ context, bucket, client_id: file.client_id, storage_path: file.storage_path, file_name: file.original_file_name || file.storage_path.split("/").pop() || "", mime_type: file.mime_type, file_size_bytes: file.file_size_bytes ?? 0 });
    if (!checked.ok) return { data: null, error: new Error(checked.message) };
    result = await supabase.storage.from(bucket).createSignedUrl(file.storage_path, 60 * 60);
  }
  return result;
}

export async function createVerifiedProfilePictureUrl(storagePath: string) {
  const bucket = "profile-pictures";
  let result = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);
  if (result.error) {
    const checked = await validateStoredUploadOnServer({ context: "profile_picture", bucket, storage_path: storagePath, file_name: storagePath.split("/").pop() || "", mime_type: null, file_size_bytes: 0 });
    if (!checked.ok) return { data: null, error: new Error(checked.message) };
    result = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);
  }
  return result;
}
