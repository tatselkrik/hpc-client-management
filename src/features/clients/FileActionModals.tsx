import type {
  ClientAssessment,
  ClientDocument,
  MobileUploadSession,
  PhoneUploadTarget,
} from "../../appShared";
import {
  formatPhoneUploadExpiry,
  formatPhoneUploadTargetLabel,
} from "../../appShared";

export type FileRenameTarget =
  | { kind: "document"; item: ClientDocument }
  | { kind: "assessment"; item: ClientAssessment };

export type FileDeleteTarget = FileRenameTarget;

const getStoredFileDisplayName = (target: FileRenameTarget) =>
  target.kind === "document"
    ? target.item.document_name || target.item.original_file_name || ""
    : target.item.assessment_name || target.item.original_file_name || "";

type FileRenameModalProps = {
  target: FileRenameTarget | null;
  inputValue: string;
  isSaving: boolean;
  onInputChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function FileRenameModal({
  target,
  inputValue,
  isSaving,
  onInputChange,
  onCancel,
  onConfirm,
}: FileRenameModalProps) {
  if (!target) return null;

  const isDocumentRename = target.kind === "document";
  const currentName = getStoredFileDisplayName(target);
  const modalTitle = `Rename ${isDocumentRename ? "Document" : "Assessment"}`;

  return (
    <div className="app-modal-overlay" role="presentation">
      <form
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-rename-modal-title"
        onSubmit={(event) => {
          event.preventDefault();
          void onConfirm();
        }}
      >
        <div className="app-modal-header">
          <div>
            <h3 id="file-rename-modal-title">{modalTitle}</h3>
            <p className="app-modal-subtitle">
              Update the display name shown in this client record. The original file is unchanged.
            </p>
          </div>

          <button
            type="button"
            className="phone-upload-close-button"
            onClick={onCancel}
            aria-label="Close rename dialog"
          >
            ×
          </button>
        </div>

        <label className="form-label">
          Display Name
          <input
            className="search-input"
            type="text"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            autoFocus
          />
        </label>

        <p className="app-modal-helper">Current name: {currentName || "Not set"}</p>

        <div className="app-modal-actions">
          <button
            type="button"
            className="small-button secondary-button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="small-button"
            disabled={isSaving || inputValue.trim() === ""}
          >
            {isSaving ? "Saving..." : "Save Name"}
          </button>
        </div>
      </form>
    </div>
  );
}

type FileDeleteModalProps = {
  target: FileDeleteTarget | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function FileDeleteModal({
  target,
  isDeleting,
  onCancel,
  onConfirm,
}: FileDeleteModalProps) {
  if (!target) return null;

  const isDocumentDelete = target.kind === "document";
  const fileLabel = getStoredFileDisplayName(target) || `this ${isDocumentDelete ? "document" : "assessment"}`;
  const modalTitle = `Delete ${isDocumentDelete ? "Document" : "Assessment"}`;

  return (
    <div className="app-modal-overlay" role="presentation">
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-delete-modal-title"
      >
        <div className="app-modal-header">
          <div>
            <h3 id="file-delete-modal-title">{modalTitle}</h3>
            <p className="app-modal-subtitle">
              This will remove the file and its record from this client.
            </p>
          </div>

          <button
            type="button"
            className="phone-upload-close-button"
            onClick={onCancel}
            aria-label="Close delete dialog"
            disabled={isDeleting}
          >
            ×
          </button>
        </div>

        <div className="app-modal-warning">
          <strong>{fileLabel}</strong>
          <span>This action cannot be undone.</span>
        </div>

        <div className="app-modal-actions">
          <button
            type="button"
            className="small-button secondary-button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="small-button danger-button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete File"}
          </button>
        </div>
      </div>
    </div>
  );
}

type PhoneUploadModalProps = {
  isOpen: boolean;
  target: PhoneUploadTarget | null;
  selectedClientName: string | null;
  session: MobileUploadSession | null;
  isCreatingSession: boolean;
  statusMessage: string;
  qrCodeUrl: string;
  copied: boolean;
  now: number;
  onClose: () => void;
  onCopyLink: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

export function PhoneUploadModal({
  isOpen,
  target,
  selectedClientName,
  session,
  isCreatingSession,
  statusMessage,
  qrCodeUrl,
  copied,
  now,
  onClose,
  onCopyLink,
  onRefresh,
}: PhoneUploadModalProps) {
  if (!isOpen || !target) return null;

  const targetLabel = formatPhoneUploadTargetLabel(target);
  const expiresAt = session?.expires_at ?? "";
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const remainingMs = Math.max(0, expiresAtMs - now);
  const remainingMinutes = Math.floor(remainingMs / 60_000);
  const remainingSeconds = Math.floor((remainingMs % 60_000) / 1000);
  const clientName = selectedClientName ?? "this client";

  return (
    <div className="phone-upload-modal-overlay" role="presentation">
      <div
        className="phone-upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-upload-modal-title"
      >
        <div className="phone-upload-modal-header">
          <div>
            <h3 id="phone-upload-modal-title">{`Upload ${targetLabel} from Phone`}</h3>
            <p className="phone-upload-modal-subtitle">
              {`Scan this code to prepare a ${targetLabel.toLowerCase()} phone upload session for ${clientName}.`}
            </p>
            <p className="phone-upload-modal-warning">
              Upload from Phone is not working yet. This feature will be available once the website
              development is completed.
            </p>
          </div>

          <button
            type="button"
            className="phone-upload-close-button"
            onClick={onClose}
            aria-label="Close phone upload"
          >
            ×
          </button>
        </div>

        <div className="phone-upload-modal-body">
          <div className="phone-upload-qr-panel">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR code for ${targetLabel.toLowerCase()} phone upload`}
                className="phone-upload-qr-image"
              />
            ) : (
              <div className="phone-upload-qr-placeholder">
                {isCreatingSession ? "Generating QR code..." : "QR code unavailable"}
              </div>
            )}

            {session?.mobile_url && (
              <div className="phone-upload-link-row">
                <button
                  type="button"
                  className="small-button phone-upload-copy-button"
                  onClick={() => void onCopyLink()}
                >
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            )}
          </div>

          <div className="phone-upload-details">
            <div className="phone-upload-meta-card">
              <span className="phone-upload-meta-label">Client</span>
              <strong>{selectedClientName ?? "Unknown client"}</strong>
            </div>

            <div className="phone-upload-meta-card">
              <span className="phone-upload-meta-label">Destination</span>
              <strong>{targetLabel}</strong>
            </div>

            <div className="phone-upload-meta-card">
              <span className="phone-upload-meta-label">Session Status</span>
              <strong
                className={`phone-upload-status-badge phone-upload-status-${
                  session?.status ?? "pending"
                }`}
              >
                {session?.status ?? "pending"}
              </strong>
            </div>

            <div className="phone-upload-meta-card">
              <span className="phone-upload-meta-label">Expires</span>
              <strong>
                {expiresAt
                  ? `${formatPhoneUploadExpiry(expiresAt)} • ${remainingMinutes}:${remainingSeconds
                      .toString()
                      .padStart(2, "0")} left`
                  : "Waiting..."}
              </strong>
            </div>

            <div className="phone-upload-instructions">
              <p className="phone-upload-status-copy">{statusMessage}</p>
              <ol>
                <li>Scan the code with your phone camera.</li>
                <li>Open the phone upload page once the website build is ready.</li>
                <li>Take a photo, review it, and upload.</li>
                <li>The desktop list will refresh automatically.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="phone-upload-modal-actions">
          <button
            type="button"
            className="small-button phone-upload-secondary-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="small-button"
            onClick={() => void onRefresh()}
            disabled={!target || isCreatingSession}
          >
            {isCreatingSession ? "Refreshing..." : "Refresh QR"}
          </button>
        </div>
      </div>
    </div>
  );
}
