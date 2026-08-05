import type {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import { SearchIcon } from "../../components/icons";
import { StatusMessage } from "../../components/StatusMessage";
import type { ClientStoredFileRecord, UploadDateFilter } from "../../appShared";
import { CLIENT_FILE_ACCEPT, formatBytes } from "../../appShared";

type ClientFilesTabProps<FileRecord extends ClientStoredFileRecord> = {
  title: string;
  searchPlaceholder: string;
  viewOnlyMessage: string;
  emptyListMessage: string;
  emptyPreviewMessage: string;
  dateFilterAriaLabel: string;
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
  getFileDisplayName: (file: FileRecord) => string;
};

export function ClientFilesTab<FileRecord extends ClientStoredFileRecord>({
  title,
  searchPlaceholder,
  viewOnlyMessage,
  emptyListMessage,
  emptyPreviewMessage,
  dateFilterAriaLabel,
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
  getFileDisplayName,
}: ClientFilesTabProps<FileRecord>) {
  const isImage = selectedFile?.mime_type?.startsWith("image/") ?? false;
  const isPdf = selectedFile?.mime_type === "application/pdf";
  const selectedFileName = selectedFile ? getFileDisplayName(selectedFile) : "";

  return (
    <div className="panel">
      <div className="documents-panel-heading">
        <h3>{title}</h3>
      </div>

      {!canManageFiles ? (
        <StatusMessage className="dashboard-status-message" message={viewOnlyMessage} />
      ) : null}

      <div className="documents-topbar-actions">
        <div className="documents-searchbar">
          <SearchIcon />
          <input
            className="search-input"
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {canManageFiles ? (
          <>
            <button
              className="small-button"
              type="button"
              onClick={handleOpenFilePicker}
              disabled={!selectedClientId || loading}
            >
              {loading ? "Please wait..." : "+ Upload"}
            </button>

            <button
              className="small-button"
              type="button"
              onClick={() => void handleOpenPhoneUpload()}
              disabled={!selectedClientId || loading || isCreatingPhoneUploadSession}
            >
              + Upload from Phone
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        accept={CLIENT_FILE_ACCEPT}
        onChange={handleUploadFile}
      />

      <StatusMessage message={message} />

      <div className="documents-layout">
        <div className="documents-sidebar-panel">
          <div className="clients-list-header">
            <div className="clients-list-header-left">
              <p>
                {filteredFiles.length} record
                {filteredFiles.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="clients-list-tools">
              <label
                className="compact-select-label documents-list-date-filter"
                aria-label={dateFilterAriaLabel}
              >
                <select
                  className="search-input compact-select"
                  value={uploadDateFilter}
                  onChange={(event) =>
                    setUploadDateFilter(event.target.value as UploadDateFilter)
                  }
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="this_month">This month</option>
                  <option value="this_year">This year</option>
                </select>
              </label>
            </div>
          </div>

          <div className="client-list">
            {filteredFiles.length === 0 ? (
              <div className="empty-state">{emptyListMessage}</div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`document-list-item ${
                    selectedFileId === file.id ? "active" : ""
                  }`}
                >
                  <button
                    className="document-list-select"
                    type="button"
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    <div>{getFileDisplayName(file)}</div>
                    <small>
                      Modified: {new Date(file.updated_at).toLocaleDateString()}
                    </small>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="documents-preview-panel">
          {selectedFile ? (
            <>
              <div className="file-preview-heading">
                <h4>{selectedFileName}</h4>
              </div>

              <div className="file-preview-details-grid">
                <div className="file-preview-meta">
                  <p>
                    <strong>Original File:</strong> {selectedFile.original_file_name}
                  </p>
                  <p>
                    <strong>Type:</strong> {selectedFile.mime_type || "Unknown"}
                  </p>
                  <p>
                    <strong>Size:</strong> {formatBytes(selectedFile.file_size_bytes)}
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(selectedFile.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Last Modified:</strong>{" "}
                    {new Date(selectedFile.updated_at).toLocaleString()}
                  </p>
                </div>

                {canManageFiles ? (
                  <div className="file-preview-actions file-preview-actions-stacked">
                    <button
                      className="small-button secondary-button"
                      type="button"
                      onClick={() => handleRenameFile(selectedFile)}
                      disabled={loading}
                    >
                      Rename
                    </button>

                    <button
                      className="small-button"
                      type="button"
                      onClick={() => void handleDownloadFile(selectedFile)}
                      disabled={loading}
                    >
                      Download
                    </button>

                    <button
                      className="small-button danger-button"
                      type="button"
                      onClick={() => handleDeleteFile(selectedFile)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {previewLoading ? (
                <p>Loading preview...</p>
              ) : previewUrl ? (
                isImage ? (
                  <img
                    src={previewUrl}
                    alt={selectedFileName}
                    className="preview-image"
                  />
                ) : isPdf ? (
                  <iframe
                    src={previewUrl}
                    title={selectedFileName}
                    className="preview-frame"
                  />
                ) : (
                  <div className="empty-state">
                    <p>No inline preview available for this file type.</p>
                  </div>
                )
              ) : (
                <p>No preview available.</p>
              )}
            </>
          ) : (
            <div className="empty-state">{emptyPreviewMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
