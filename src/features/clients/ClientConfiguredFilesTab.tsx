import type {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import type {
  ClientStoredFileRecord,
  UploadDateFilter,
} from "../../appShared";
import { ClientFilesTab } from "./ClientFilesTab";
import {
  CLIENT_FILE_CONFIG,
  getClientFileDisplayName,
  type ClientFileKind,
} from "./clientFileConfig";

export type ClientConfiguredFilesTabProps<FileRecord extends ClientStoredFileRecord> = {
  kind: ClientFileKind;
  selectedClientId: string;
  loading: boolean;
  isCreatingPhoneUploadSession: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  uploadDateFilter: UploadDateFilter;
  setUploadDateFilter: Dispatch<SetStateAction<UploadDateFilter>>;
  handleOpenFilePicker: () => void;
  handleOpenPhoneUpload: () => void | Promise<void>;
  selectedFile: FileRecord | null;
  handleDeleteFile: (file: FileRecord) => void;
  handleRenameFile: (file: FileRecord) => void;
  handleDownloadFile: (file: FileRecord) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleUploadFile: (event: ChangeEvent<HTMLInputElement>) => void;
  message: string;
  filteredFiles: FileRecord[];
  selectedFileId: string;
  setSelectedFileId: Dispatch<SetStateAction<string>>;
  previewLoading: boolean;
  previewUrl: string;
  canManageFiles?: boolean;
  canDeleteFiles?: boolean;
};

export function ClientConfiguredFilesTab<FileRecord extends ClientStoredFileRecord>({
  kind,
  selectedClientId,
  loading,
  isCreatingPhoneUploadSession,
  search,
  setSearch,
  uploadDateFilter,
  setUploadDateFilter,
  handleOpenFilePicker,
  handleOpenPhoneUpload,
  selectedFile,
  handleDeleteFile,
  handleRenameFile,
  handleDownloadFile,
  fileInputRef,
  handleUploadFile,
  message,
  filteredFiles,
  selectedFileId,
  setSelectedFileId,
  previewLoading,
  previewUrl,
  canManageFiles = true,
  canDeleteFiles = canManageFiles,
}: ClientConfiguredFilesTabProps<FileRecord>) {
  const config = CLIENT_FILE_CONFIG[kind];

  return (
    <ClientFilesTab
      title={config.title}
      searchPlaceholder={config.searchPlaceholder}
      viewOnlyMessage={config.viewOnlyMessage}
      emptyListMessage={config.emptyListMessage}
      emptyPreviewMessage={config.emptyPreviewMessage}
      dateFilterAriaLabel={config.dateFilterAriaLabel}
      selectedClientId={selectedClientId}
      loading={loading}
      isCreatingPhoneUploadSession={isCreatingPhoneUploadSession}
      search={search}
      setSearch={setSearch}
      uploadDateFilter={uploadDateFilter}
      setUploadDateFilter={setUploadDateFilter}
      handleOpenFilePicker={handleOpenFilePicker}
      handleOpenPhoneUpload={handleOpenPhoneUpload}
      selectedFile={selectedFile}
      handleDeleteFile={handleDeleteFile}
      handleRenameFile={handleRenameFile}
      handleDownloadFile={handleDownloadFile}
      fileInputRef={fileInputRef}
      handleUploadFile={handleUploadFile}
      message={message}
      filteredFiles={filteredFiles}
      selectedFileId={selectedFileId}
      setSelectedFileId={setSelectedFileId}
      previewLoading={previewLoading}
      previewUrl={previewUrl}
      canManageFiles={canManageFiles}
      canDeleteFiles={canDeleteFiles}
      getFileDisplayName={(file) => getClientFileDisplayName(kind, file)}
    />
  );
}
