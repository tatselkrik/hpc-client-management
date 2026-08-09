import type {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import type {
  ClientDocument,
  PhoneUploadTarget,
  UploadDateFilter,
} from "../../appShared";
import { ClientConfiguredFilesTab } from "./ClientConfiguredFilesTab";

type ClientDocumentsTabProps = {
  selectedClientId: string;
  loading: boolean;
  isCreatingPhoneUploadSession: boolean;
  documentSearch: string;
  setDocumentSearch: Dispatch<SetStateAction<string>>;
  documentUploadDateFilter: UploadDateFilter;
  setDocumentUploadDateFilter: Dispatch<SetStateAction<UploadDateFilter>>;
  handleOpenDocumentPicker: () => void;
  handleOpenPhoneUpload: (target: PhoneUploadTarget) => Promise<void>;
  selectedDocument: ClientDocument | null;
  handleDeleteDocument: (document: ClientDocument) => void;
  handleRenameDocument: (document: ClientDocument) => void;
  handleDownloadDocument: (document: ClientDocument) => void;
  documentInputRef: RefObject<HTMLInputElement | null>;
  handleUploadDocument: (event: ChangeEvent<HTMLInputElement>) => void;
  documentsMessage: string;
  filteredDocuments: ClientDocument[];
  selectedDocumentId: string;
  setSelectedDocumentId: Dispatch<SetStateAction<string>>;
  documentPreviewLoading: boolean;
  documentPreviewUrl: string;
  canManageDocuments?: boolean;
  canDeleteDocuments?: boolean;
};

export function ClientDocumentsTab({
  selectedClientId,
  loading,
  isCreatingPhoneUploadSession,
  documentSearch,
  setDocumentSearch,
  documentUploadDateFilter,
  setDocumentUploadDateFilter,
  handleOpenDocumentPicker,
  handleOpenPhoneUpload,
  selectedDocument,
  handleDeleteDocument,
  handleRenameDocument,
  handleDownloadDocument,
  documentInputRef,
  handleUploadDocument,
  documentsMessage,
  filteredDocuments,
  selectedDocumentId,
  setSelectedDocumentId,
  documentPreviewLoading,
  documentPreviewUrl,
  canManageDocuments = true,
  canDeleteDocuments = canManageDocuments,
}: ClientDocumentsTabProps) {
  return (
    <ClientConfiguredFilesTab
      kind="document"
      selectedClientId={selectedClientId}
      loading={loading}
      isCreatingPhoneUploadSession={isCreatingPhoneUploadSession}
      search={documentSearch}
      setSearch={setDocumentSearch}
      uploadDateFilter={documentUploadDateFilter}
      setUploadDateFilter={setDocumentUploadDateFilter}
      handleOpenFilePicker={handleOpenDocumentPicker}
      handleOpenPhoneUpload={() => handleOpenPhoneUpload("document")}
      selectedFile={selectedDocument}
      handleDeleteFile={handleDeleteDocument}
      handleRenameFile={handleRenameDocument}
      handleDownloadFile={handleDownloadDocument}
      fileInputRef={documentInputRef}
      handleUploadFile={handleUploadDocument}
      message={documentsMessage}
      filteredFiles={filteredDocuments}
      selectedFileId={selectedDocumentId}
      setSelectedFileId={setSelectedDocumentId}
      previewLoading={documentPreviewLoading}
      previewUrl={documentPreviewUrl}
      canManageFiles={canManageDocuments}
      canDeleteFiles={canDeleteDocuments}
    />
  );
}
