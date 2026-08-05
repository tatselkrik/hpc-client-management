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
