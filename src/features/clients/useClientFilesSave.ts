import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { validateStoredUploadOnServer } from "../../lib/uploadValidation";
import type {
  ClientAssessment,
  ClientDocument,
  ClientListItem,
} from "../../appShared";
import {
  CLIENT_FILE_ALLOWED_LABEL,
  getClientFileValidationMessage,
  sanitizeFileName,
} from "../../appShared";
import {
  CLIENT_FILE_CONFIG,
  getClientFileDisplayName,
  getClientOriginalFileName,
  type ClientFileItem,
  type ClientFileKind,
} from "./clientFileConfig";

type WriteAuditLog = (
  module: string,
  action: string,
  entityType: string | null,
  entityId: string | null,
  entityLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseClientFilesSaveParams = {
  selectedClientId: string;
  selectedClient: ClientListItem | null | undefined;
  selectedDocumentId: string;
  setSelectedDocumentId: Dispatch<SetStateAction<string>>;
  setDocumentPreviewUrl: Dispatch<SetStateAction<string>>;
  selectedAssessmentId: string;
  setSelectedAssessmentId: Dispatch<SetStateAction<string>>;
  setAssessmentPreviewUrl: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setDocumentsMessage: Dispatch<SetStateAction<string>>;
  setAssessmentsMessage: Dispatch<SetStateAction<string>>;
  loadDocuments: (clientId: string) => Promise<void>;
  loadAssessments: (clientId: string) => Promise<void>;
  writeAuditLog: WriteAuditLog;
};

const getSafeDownloadName = (preferredName: string) => {
  const sanitizedName = sanitizeFileName(preferredName || "client-file");
  return sanitizedName || "client-file";
};

const downloadStorageFileToDisk = async ({
  bucket,
  storagePath,
  fileName,
}: {
  bucket: string;
  storagePath: string;
  fileName: string;
}) => {
  const downloadResult = await supabase.storage.from(bucket).download(storagePath);

  if (downloadResult.error) {
    throw new Error(downloadResult.error.message);
  }

  const safeFileName = getSafeDownloadName(fileName);
  const selectedSavePath = await save({
    title: "Save client file",
    defaultPath: safeFileName,
  });

  if (!selectedSavePath) {
    return null;
  }

  const fileBytes = new Uint8Array(await downloadResult.data.arrayBuffer());
  await writeFile(selectedSavePath, fileBytes);

  return selectedSavePath;
};

export function useClientFilesSave({
  selectedClientId,
  selectedClient,
  selectedDocumentId,
  setSelectedDocumentId,
  setDocumentPreviewUrl,
  selectedAssessmentId,
  setSelectedAssessmentId,
  setAssessmentPreviewUrl,
  setLoading,
  setDocumentsMessage,
  setAssessmentsMessage,
  loadDocuments,
  loadAssessments,
  writeAuditLog,
}: UseClientFilesSaveParams) {
  const messageSetterByKind = {
    document: setDocumentsMessage,
    assessment: setAssessmentsMessage,
  };

  const loadItemsByKind = {
    document: loadDocuments,
    assessment: loadAssessments,
  };

  const selectedIdByKind = {
    document: selectedDocumentId,
    assessment: selectedAssessmentId,
  };

  const setSelectedIdByKind = {
    document: setSelectedDocumentId,
    assessment: setSelectedAssessmentId,
  };

  const setPreviewUrlByKind = {
    document: setDocumentPreviewUrl,
    assessment: setAssessmentPreviewUrl,
  };

  const uploadClientFile = async (
    kind: ClientFileKind,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const config = CLIENT_FILE_CONFIG[kind];
    const setMessage = messageSetterByKind[kind];
    const file = event.target.files?.[0];

    if (!file || !selectedClientId) return;

    try {
      const validationMessage = getClientFileValidationMessage(file);
      if (validationMessage) {
        setMessage(validationMessage);
        return;
      }

      setLoading(true);
      setMessage(feedbackMessages.loading(`Uploading ${config.lowerLabel}`));

      const safeFileName = sanitizeFileName(file.name);
      const storagePath = `${selectedClientId}/${Date.now()}-${safeFileName}`;

      const uploadResult = await supabase.storage
        .from(config.bucket)
        .upload(storagePath, file);

      if (uploadResult.error) {
        setMessage(
          feedbackMessages.uploadFailed(config.lowerLabel, `${uploadResult.error.message}. Allowed files: ${CLIENT_FILE_ALLOWED_LABEL}.`)
        );
        return;
      }

      const serverValidation = await validateStoredUploadOnServer({
        context: kind === "document" ? "client_document" : "client_assessment",
        bucket: config.bucket,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        client_id: selectedClientId,
      });

      if (!serverValidation.ok) {
        await supabase.storage.from(config.bucket).remove([storagePath]);
        setMessage(
          feedbackMessages.error(
            `We could not accept this ${config.lowerLabel}.`,
            serverValidation.message
          )
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const metadata = {
        client_id: selectedClientId,
        [config.nameColumn]: file.name,
        original_file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        created_by: user?.id ?? null,
      };

      const insertResult = await supabase
        .from(config.table)
        .insert(metadata)
        .select("id")
        .single();

      if (insertResult.error) {
        await supabase.storage.from(config.bucket).remove([storagePath]);
        setMessage(feedbackMessages.saveFailed(`${config.lowerLabel} details`, insertResult.error.message));
        return;
      }

      const insertedId =
        typeof insertResult.data?.id === "string" ? insertResult.data.id : "";

      await loadItemsByKind[kind](selectedClientId);
      await writeAuditLog(
        config.moduleLabel,
        "Uploaded",
        config.entityType,
        insertedId || null,
        file.name,
        {
          summary: config.auditSummary.uploaded,
          client_id: selectedClientId,
          client_name: selectedClient?.client_name ?? null,
          file_name: file.name,
          file_size_bytes: file.size,
        }
      );

      if (insertedId) {
        setSelectedIdByKind[kind](insertedId);
      }

      setMessage(feedbackMessages.uploaded(config.lowerLabel));
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const deleteClientFile = async (kind: ClientFileKind, item: ClientFileItem) => {
    const config = CLIENT_FILE_CONFIG[kind];
    const setMessage = messageSetterByKind[kind];
    const fileLabel = getClientFileDisplayName(kind, item) || `this ${config.lowerLabel}`;

    setLoading(true);
    setMessage(feedbackMessages.loading(`Deleting ${fileLabel}`));

    try {
      const deleteResult = await supabase
        .from(config.table)
        .delete()
        .eq("id", item.id);

      if (deleteResult.error) {
        setMessage(feedbackMessages.deleteFailed(config.lowerLabel, deleteResult.error.message));
        return;
      }

      const removeResult = await supabase.storage
        .from(config.bucket)
        .remove([item.storage_path]);

      const wasSelected = selectedIdByKind[kind] === item.id;
      if (wasSelected) {
        setSelectedIdByKind[kind]("");
        setPreviewUrlByKind[kind]("");
      }

      await loadItemsByKind[kind](selectedClientId);
      await writeAuditLog(
        config.moduleLabel,
        "Deleted",
        config.entityType,
        item.id,
        getClientFileDisplayName(kind, item) || `Client ${config.lowerLabel}`,
        {
          summary: config.auditSummary.deleted,
          client_id: selectedClientId,
          client_name: selectedClient?.client_name ?? null,
          file_name: getClientOriginalFileName(kind, item),
          storage_cleanup_error: removeResult.error?.message ?? null,
        }
      );

      if (removeResult.error) {
        setMessage(
          feedbackMessages.warning(`${config.singularLabel} record was deleted, but the stored file could not be removed. ${removeResult.error.message}`)
        );
        return;
      }

      setMessage(feedbackMessages.deleted(config.lowerLabel));
    } finally {
      setLoading(false);
    }
  };

  const renameClientFile = async (
    kind: ClientFileKind,
    item: ClientFileItem,
    nextName: string
  ) => {
    const config = CLIENT_FILE_CONFIG[kind];
    const setMessage = messageSetterByKind[kind];
    const currentName = getClientFileDisplayName(kind, item);
    const trimmedName = nextName.trim();

    if (!trimmedName) {
      setMessage(feedbackMessages.required(`${config.lowerLabel} name`));
      return false;
    }

    if (trimmedName === currentName) return true;

    setLoading(true);
    setMessage(feedbackMessages.loading(`Renaming ${config.lowerLabel}`));

    try {
      const { error } = await supabase
        .from(config.table)
        .update({ [config.nameColumn]: trimmedName })
        .eq("id", item.id);

      if (error) {
        setMessage(feedbackMessages.renameFailed(config.lowerLabel, error.message));
        return false;
      }

      await loadItemsByKind[kind](selectedClientId);
      await writeAuditLog(
        config.moduleLabel,
        "Renamed",
        config.entityType,
        item.id,
        trimmedName,
        {
          summary: `Renamed ${config.auditSummary.renamedLabel} from "${currentName}" to "${trimmedName}".`,
          client_id: selectedClientId,
          client_name: selectedClient?.client_name ?? null,
          previous_name: currentName,
          new_name: trimmedName,
        }
      );

      setSelectedIdByKind[kind](item.id);
      setMessage(feedbackMessages.renamed(config.lowerLabel));
      return true;
    } finally {
      setLoading(false);
    }
  };

  const downloadClientFile = async (kind: ClientFileKind, item: ClientFileItem) => {
    const config = CLIENT_FILE_CONFIG[kind];
    const setMessage = messageSetterByKind[kind];
    const fileLabel =
      getClientOriginalFileName(kind, item) ||
      getClientFileDisplayName(kind, item) ||
      config.fallbackFileName;

    setLoading(true);
    setMessage(feedbackMessages.loading(`Preparing ${fileLabel} for download`));

    try {
      const savedPath = await downloadStorageFileToDisk({
        bucket: config.bucket,
        storagePath: item.storage_path,
        fileName: fileLabel,
      });

      if (!savedPath) {
        setMessage(feedbackMessages.cancelled(`${config.lowerLabel} download`));
        return;
      }

      await writeAuditLog(
        config.moduleLabel,
        "Downloaded",
        config.entityType,
        item.id,
        getClientFileDisplayName(kind, item) || `Client ${config.lowerLabel}`,
        {
          summary: config.auditSummary.downloaded,
          client_id: selectedClientId,
          client_name: selectedClient?.client_name ?? null,
          file_name: fileLabel,
        }
      );

      setMessage(feedbackMessages.downloaded(config.lowerLabel, savedPath));
    } catch (error) {
      const message = getErrorDetail(error, "Unknown download error");
      setMessage(feedbackMessages.downloadFailed(config.lowerLabel, message));
    } finally {
      setLoading(false);
    }
  };

  return {
    handleUploadDocument: (event: ChangeEvent<HTMLInputElement>) =>
      uploadClientFile("document", event),
    handleUploadAssessment: (event: ChangeEvent<HTMLInputElement>) =>
      uploadClientFile("assessment", event),
    handleDeleteDocument: (document: ClientDocument) =>
      deleteClientFile("document", document),
    handleDeleteAssessment: (assessment: ClientAssessment) =>
      deleteClientFile("assessment", assessment),
    handleRenameDocument: (document: ClientDocument, nextName: string) =>
      renameClientFile("document", document, nextName),
    handleRenameAssessment: (assessment: ClientAssessment, nextName: string) =>
      renameClientFile("assessment", assessment, nextName),
    handleDownloadDocument: (document: ClientDocument) =>
      downloadClientFile("document", document),
    handleDownloadAssessment: (assessment: ClientAssessment) =>
      downloadClientFile("assessment", assessment),
  };
}
