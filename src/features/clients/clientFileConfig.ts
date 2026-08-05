import type {
  ClientAssessment,
  ClientDocument,
  ClientStoredFileRecord,
  PhoneUploadTarget,
} from "../../appShared";

export type ClientFileKind = PhoneUploadTarget;
export type ClientFileItem = ClientDocument | ClientAssessment;

export type ClientFileConfig = {
  kind: ClientFileKind;
  title: "Documents" | "Assessments";
  searchPlaceholder: string;
  viewOnlyMessage: string;
  emptyListMessage: string;
  emptyPreviewMessage: string;
  dateFilterAriaLabel: string;
  bucket: "client-documents" | "client-assessments";
  table: "client_documents" | "client_assessments";
  selectColumns: string;
  nameColumn: "document_name" | "assessment_name";
  moduleLabel: "Documents" | "Assessments";
  entityType: "client_document" | "client_assessment";
  singularLabel: "Document" | "Assessment";
  lowerLabel: "document" | "assessment";
  fallbackFileName: "client-document" | "client-assessment";
  permissionMessages: {
    addEdit: string;
    rename: string;
    delete: string;
  };
  auditSummary: {
    uploaded: string;
    deleted: string;
    renamedLabel: "document" | "assessment";
    downloaded: string;
  };
};

export const CLIENT_FILE_CONFIG: Record<ClientFileKind, ClientFileConfig> = {
  document: {
    kind: "document",
    title: "Documents",
    searchPlaceholder: "Search documents...",
    viewOnlyMessage:
      "Your role can view documents, but cannot upload, rename, download, or delete them.",
    emptyListMessage: "No documents found.",
    emptyPreviewMessage: "Select a document to preview it.",
    dateFilterAriaLabel: "Filter documents by upload date",
    bucket: "client-documents",
    table: "client_documents",
    selectColumns:
      "id, client_id, document_name, original_file_name, storage_path, mime_type, file_size_bytes, created_at, updated_at",
    nameColumn: "document_name",
    moduleLabel: "Documents",
    entityType: "client_document",
    singularLabel: "Document",
    lowerLabel: "document",
    fallbackFileName: "client-document",
    permissionMessages: {
      addEdit: "Your role can view documents but cannot add or edit them.",
      rename: "Your role can view documents but cannot rename them.",
      delete: "Your role can view documents but cannot delete them.",
    },
    auditSummary: {
      uploaded: "Uploaded a client document.",
      deleted: "Deleted a client document.",
      renamedLabel: "document",
      downloaded: "Downloaded a client document.",
    },
  },
  assessment: {
    kind: "assessment",
    title: "Assessments",
    searchPlaceholder: "Search assessments...",
    viewOnlyMessage:
      "Your role can view assessments, but cannot upload, rename, download, or delete them.",
    emptyListMessage: "No assessments found.",
    emptyPreviewMessage: "Select an assessment to preview it.",
    dateFilterAriaLabel: "Filter assessments by upload date",
    bucket: "client-assessments",
    table: "client_assessments",
    selectColumns:
      "id, client_id, assessment_name, original_file_name, storage_path, mime_type, file_size_bytes, created_at, updated_at",
    nameColumn: "assessment_name",
    moduleLabel: "Assessments",
    entityType: "client_assessment",
    singularLabel: "Assessment",
    lowerLabel: "assessment",
    fallbackFileName: "client-assessment",
    permissionMessages: {
      addEdit: "Your role can view assessments but cannot add or edit them.",
      rename: "Your role can view assessments but cannot rename them.",
      delete: "Your role can view assessments but cannot delete them.",
    },
    auditSummary: {
      uploaded: "Uploaded a client assessment.",
      deleted: "Deleted a client assessment.",
      renamedLabel: "assessment",
      downloaded: "Downloaded a client assessment.",
    },
  },
};

export const getClientFileDisplayName = (
  kind: ClientFileKind,
  file: ClientStoredFileRecord
) => {
  if (kind === "document") {
    const document = file as ClientDocument;
    return document.document_name || document.original_file_name || "";
  }

  const assessment = file as ClientAssessment;
  return assessment.assessment_name || assessment.original_file_name || "";
};

export const getClientOriginalFileName = (
  _kind: ClientFileKind,
  file: ClientStoredFileRecord
) => file.original_file_name;
