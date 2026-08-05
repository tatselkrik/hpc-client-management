import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type {
  ClientAssessment,
  ClientDocument,
  ClientListItem,
} from "../../appShared";
import type { FileDeleteTarget, FileRenameTarget } from "./FileActionModals";
import {
  CLIENT_FILE_CONFIG,
  getClientFileDisplayName,
  type ClientFileKind,
} from "./clientFileConfig";
import { useClientFilesSave } from "./useClientFilesSave";

type WriteAuditLog = (
  module: string,
  action: string,
  entityType: string | null,
  entityId: string | null,
  entityLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseClientFileWorkflowParams = {
  selectedClientId: string;
  selectedClient: ClientListItem | null | undefined;
  selectedDocument: ClientDocument | null | undefined;
  selectedDocumentId: string;
  setSelectedDocumentId: Dispatch<SetStateAction<string>>;
  selectedAssessment: ClientAssessment | null | undefined;
  selectedAssessmentId: string;
  setSelectedAssessmentId: Dispatch<SetStateAction<string>>;
  canManageClientDocuments: boolean;
  canManageClientAssessments: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setDocumentsMessage: Dispatch<SetStateAction<string>>;
  setAssessmentsMessage: Dispatch<SetStateAction<string>>;
  loadDocuments: (clientId: string) => Promise<void>;
  loadAssessments: (clientId: string) => Promise<void>;
  openPhoneUploadSession: (target: ClientFileKind) => Promise<void>;
  writeAuditLog: WriteAuditLog;
};

export function useClientFileWorkflow({
  selectedClientId,
  selectedClient,
  selectedDocument,
  selectedDocumentId,
  setSelectedDocumentId,
  selectedAssessment,
  selectedAssessmentId,
  setSelectedAssessmentId,
  canManageClientDocuments,
  canManageClientAssessments,
  setLoading,
  setDocumentsMessage,
  setAssessmentsMessage,
  loadDocuments,
  loadAssessments,
  openPhoneUploadSession,
  writeAuditLog,
}: UseClientFileWorkflowParams) {
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState("");
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [assessmentPreviewUrl, setAssessmentPreviewUrl] = useState("");
  const [assessmentPreviewLoading, setAssessmentPreviewLoading] = useState(false);
  const [fileRenameTarget, setFileRenameTarget] = useState<FileRenameTarget | null>(null);
  const [fileRenameInput, setFileRenameInput] = useState("");
  const [fileDeleteTarget, setFileDeleteTarget] = useState<FileDeleteTarget | null>(null);

  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const assessmentInputRef = useRef<HTMLInputElement | null>(null);
  const documentPreviewRequestRef = useRef(0);
  const assessmentPreviewRequestRef = useRef(0);

  const loadDocumentPreview = useCallback(
    async (document: ClientDocument) => {
      const requestId = ++documentPreviewRequestRef.current;

      setDocumentPreviewLoading(true);

      const { data, error } = await supabase.storage
        .from(CLIENT_FILE_CONFIG.document.bucket)
        .createSignedUrl(document.storage_path, 60 * 60);

      if (requestId !== documentPreviewRequestRef.current) return;

      if (error) {
        setDocumentsMessage(feedbackMessages.error("We could not open the document preview.", error.message));
        setDocumentPreviewUrl("");
        setDocumentPreviewLoading(false);
        return;
      }

      setDocumentPreviewUrl(data.signedUrl);
      setDocumentPreviewLoading(false);
    },
    [setDocumentsMessage]
  );

  const loadAssessmentPreview = useCallback(
    async (assessment: ClientAssessment) => {
      const requestId = ++assessmentPreviewRequestRef.current;

      setAssessmentPreviewLoading(true);

      const { data, error } = await supabase.storage
        .from(CLIENT_FILE_CONFIG.assessment.bucket)
        .createSignedUrl(assessment.storage_path, 60 * 60);

      if (requestId !== assessmentPreviewRequestRef.current) return;

      if (error) {
        setAssessmentsMessage(feedbackMessages.error("We could not open the assessment preview.", error.message));
        setAssessmentPreviewUrl("");
        setAssessmentPreviewLoading(false);
        return;
      }

      setAssessmentPreviewUrl(data.signedUrl);
      setAssessmentPreviewLoading(false);
    },
    [setAssessmentsMessage]
  );

  useEffect(() => {
    if (selectedDocument) {
      void loadDocumentPreview(selectedDocument);
    } else {
      documentPreviewRequestRef.current += 1;
      setDocumentPreviewUrl("");
      setDocumentPreviewLoading(false);
    }
  }, [selectedDocument, loadDocumentPreview]);

  useEffect(() => {
    if (selectedAssessment) {
      void loadAssessmentPreview(selectedAssessment);
    } else {
      assessmentPreviewRequestRef.current += 1;
      setAssessmentPreviewUrl("");
      setAssessmentPreviewLoading(false);
    }
  }, [selectedAssessment, loadAssessmentPreview]);

  const handleOpenPhoneUpload = useCallback(
    async (target: ClientFileKind) => {
      const config = CLIENT_FILE_CONFIG[target];

      if (target === "document" && !canManageClientDocuments) {
        setDocumentsMessage(config.permissionMessages.addEdit);
        return;
      }

      if (target === "assessment" && !canManageClientAssessments) {
        setAssessmentsMessage(config.permissionMessages.addEdit);
        return;
      }

      await openPhoneUploadSession(target);
    },
    [
      canManageClientAssessments,
      canManageClientDocuments,
      openPhoneUploadSession,
      setAssessmentsMessage,
      setDocumentsMessage,
    ]
  );

  const handleOpenDocumentPicker = useCallback(() => {
    if (!canManageClientDocuments) {
      setDocumentsMessage(CLIENT_FILE_CONFIG.document.permissionMessages.addEdit);
      return;
    }

    documentInputRef.current?.click();
  }, [canManageClientDocuments, setDocumentsMessage]);

  const handleOpenAssessmentPicker = useCallback(() => {
    if (!canManageClientAssessments) {
      setAssessmentsMessage(CLIENT_FILE_CONFIG.assessment.permissionMessages.addEdit);
      return;
    }

    assessmentInputRef.current?.click();
  }, [canManageClientAssessments, setAssessmentsMessage]);

  const {
    handleUploadDocument,
    handleUploadAssessment,
    handleDeleteDocument,
    handleDeleteAssessment,
    handleRenameDocument: saveDocumentDisplayName,
    handleRenameAssessment: saveAssessmentDisplayName,
    handleDownloadDocument,
    handleDownloadAssessment,
  } = useClientFilesSave({
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
  });

  const handleOpenDocumentRename = useCallback(
    (document: ClientDocument) => {
      if (!canManageClientDocuments) {
        setDocumentsMessage(CLIENT_FILE_CONFIG.document.permissionMessages.rename);
        return;
      }

      setSelectedDocumentId(document.id);
      setFileRenameTarget({ kind: "document", item: document });
      setFileRenameInput(getClientFileDisplayName("document", document));
    },
    [canManageClientDocuments, setDocumentsMessage, setSelectedDocumentId]
  );

  const handleOpenAssessmentRename = useCallback(
    (assessment: ClientAssessment) => {
      if (!canManageClientAssessments) {
        setAssessmentsMessage(CLIENT_FILE_CONFIG.assessment.permissionMessages.rename);
        return;
      }

      setSelectedAssessmentId(assessment.id);
      setFileRenameTarget({ kind: "assessment", item: assessment });
      setFileRenameInput(getClientFileDisplayName("assessment", assessment));
    },
    [canManageClientAssessments, setAssessmentsMessage, setSelectedAssessmentId]
  );

  const handleOpenDocumentDelete = useCallback(
    (document: ClientDocument) => {
      if (!canManageClientDocuments) {
        setDocumentsMessage(CLIENT_FILE_CONFIG.document.permissionMessages.delete);
        return;
      }

      setSelectedDocumentId(document.id);
      setFileDeleteTarget({ kind: "document", item: document });
    },
    [canManageClientDocuments, setDocumentsMessage, setSelectedDocumentId]
  );

  const handleOpenAssessmentDelete = useCallback(
    (assessment: ClientAssessment) => {
      if (!canManageClientAssessments) {
        setAssessmentsMessage(CLIENT_FILE_CONFIG.assessment.permissionMessages.delete);
        return;
      }

      setSelectedAssessmentId(assessment.id);
      setFileDeleteTarget({ kind: "assessment", item: assessment });
    },
    [canManageClientAssessments, setAssessmentsMessage, setSelectedAssessmentId]
  );

  const handleCloseFileDeleteModal = useCallback(() => {
    setFileDeleteTarget(null);
  }, []);

  const handleConfirmFileDelete = useCallback(async () => {
    if (!fileDeleteTarget) return;

    if (
      (fileDeleteTarget.kind === "document" && !canManageClientDocuments) ||
      (fileDeleteTarget.kind === "assessment" && !canManageClientAssessments)
    ) {
      if (fileDeleteTarget.kind === "document") {
        setDocumentsMessage(CLIENT_FILE_CONFIG.document.permissionMessages.delete);
      } else {
        setAssessmentsMessage(CLIENT_FILE_CONFIG.assessment.permissionMessages.delete);
      }
      handleCloseFileDeleteModal();
      return;
    }

    if (fileDeleteTarget.kind === "document") {
      await handleDeleteDocument(fileDeleteTarget.item);
    } else {
      await handleDeleteAssessment(fileDeleteTarget.item);
    }

    handleCloseFileDeleteModal();
  }, [
    canManageClientAssessments,
    canManageClientDocuments,
    fileDeleteTarget,
    handleCloseFileDeleteModal,
    handleDeleteAssessment,
    handleDeleteDocument,
    setAssessmentsMessage,
    setDocumentsMessage,
  ]);

  const handleCloseFileRenameModal = useCallback(() => {
    setFileRenameTarget(null);
    setFileRenameInput("");
  }, []);

  const handleConfirmFileRename = useCallback(async () => {
    if (!fileRenameTarget) return;

    if (
      (fileRenameTarget.kind === "document" && !canManageClientDocuments) ||
      (fileRenameTarget.kind === "assessment" && !canManageClientAssessments)
    ) {
      if (fileRenameTarget.kind === "document") {
        setDocumentsMessage(CLIENT_FILE_CONFIG.document.permissionMessages.rename);
      } else {
        setAssessmentsMessage(CLIENT_FILE_CONFIG.assessment.permissionMessages.rename);
      }
      handleCloseFileRenameModal();
      return;
    }

    const wasSaved =
      fileRenameTarget.kind === "document"
        ? await saveDocumentDisplayName(fileRenameTarget.item, fileRenameInput)
        : await saveAssessmentDisplayName(fileRenameTarget.item, fileRenameInput);

    if (wasSaved) {
      handleCloseFileRenameModal();
    }
  }, [
    canManageClientAssessments,
    canManageClientDocuments,
    fileRenameInput,
    fileRenameTarget,
    handleCloseFileRenameModal,
    saveAssessmentDisplayName,
    saveDocumentDisplayName,
    setAssessmentsMessage,
    setDocumentsMessage,
  ]);

  return {
    documentInputRef,
    assessmentInputRef,
    documentPreviewUrl,
    setDocumentPreviewUrl,
    documentPreviewLoading,
    setDocumentPreviewLoading,
    assessmentPreviewUrl,
    setAssessmentPreviewUrl,
    assessmentPreviewLoading,
    setAssessmentPreviewLoading,
    fileRenameTarget,
    fileRenameInput,
    setFileRenameInput,
    fileDeleteTarget,
    handleOpenDocumentPicker,
    handleOpenAssessmentPicker,
    handleOpenPhoneUpload,
    handleUploadDocument,
    handleUploadAssessment,
    handleOpenDocumentDelete,
    handleOpenAssessmentDelete,
    handleOpenDocumentRename,
    handleOpenAssessmentRename,
    handleDownloadDocument,
    handleDownloadAssessment,
    handleCloseFileDeleteModal,
    handleConfirmFileDelete,
    handleCloseFileRenameModal,
    handleConfirmFileRename,
  };
}
