import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";

import type { BackupRestorePreview } from "../../appShared";
import { formatAuditTimestamp } from "../../appShared";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";

type SettingsBackupRestoreCardProps = {
  canManageCareTeam: boolean;
  canRestoreClinicBackup: boolean;
  isExportingBackup: boolean;
  isRestoringBackup: boolean;
  backupToolsStatus: string;
  restorePreview: BackupRestorePreview | null;
  isRestoreConfirmationOpen: boolean;
  restoreConfirmationText: string;
  setRestoreConfirmationText: Dispatch<SetStateAction<string>>;
  backupRestoreInputRef: RefObject<HTMLInputElement | null>;
  handleExportClinicBackup: () => void | Promise<void>;
  handleChooseRestorePackage: () => void;
  handleRestorePackageSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleOpenRestoreConfirmation: () => void;
  handleCloseRestoreConfirmation: () => void;
  handleConfirmRestore: () => void | Promise<void>;
};

export function SettingsBackupRestoreCard({
  canManageCareTeam,
  canRestoreClinicBackup,
  isExportingBackup,
  isRestoringBackup,
  backupToolsStatus,
  restorePreview,
  isRestoreConfirmationOpen,
  restoreConfirmationText,
  setRestoreConfirmationText,
  backupRestoreInputRef,
  handleExportClinicBackup,
  handleChooseRestorePackage,
  handleRestorePackageSelected,
  handleOpenRestoreConfirmation,
  handleCloseRestoreConfirmation,
  handleConfirmRestore,
}: SettingsBackupRestoreCardProps) {
  const packageIsRestorable = restorePreview?.format_version === 2;

  return (
    <section className="settings-module-card">
      <SectionHeader
        className="settings-module-header"
        kicker="Data protection"
        title="Backup and restore"
        titleClassName="settings-module-title"
        actions={<span className="settings-module-badge live">Available</span>}
      />

      <p className="settings-module-copy">
        Export clinic records to a JSON package, review its contents, and restore records safely
        into this same Supabase project.
      </p>

      {canManageCareTeam ? (
        <div className="settings-backup-tools">
          <div className="settings-backup-safety-note">
            <strong>Merge restore</strong>
            <span>
              Restoring updates matching record IDs and adds missing records. It never deletes
              records that are absent from the package. Account identities and stored file contents
              are not recreated; only application records and file metadata are included.
            </span>
          </div>

          <div className="settings-backup-actions">
            <button
              type="button"
              className="small-button"
              onClick={() => void handleExportClinicBackup()}
              disabled={isExportingBackup || isRestoringBackup}
            >
              {isExportingBackup ? "Exporting backup…" : "Export backup (.json)"}
            </button>

            <button
              type="button"
              className="small-button settings-backup-secondary-button"
              onClick={handleChooseRestorePackage}
              disabled={isExportingBackup || isRestoringBackup}
            >
              Choose backup package
            </button>

            <input
              ref={backupRestoreInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden-file-input"
              onChange={(event) => void handleRestorePackageSelected(event)}
            />
          </div>

          {backupToolsStatus ? (
            <StatusMessage className="settings-backup-status" message={backupToolsStatus} />
          ) : (
            <p className="settings-backup-status">
              Create a new backup before major administrative or data changes.
            </p>
          )}

          {restorePreview ? (
            <div className="settings-backup-preview">
              <div className="settings-backup-preview-header">
                <div className="settings-backup-preview-copy">
                  <strong>{restorePreview.file_name}</strong>
                  <span>
                    {restorePreview.product_name} · {formatAuditTimestamp(restorePreview.exported_at)}
                  </span>
                  <span>
                    Package format {restorePreview.format_version} · Project {restorePreview.source_project_ref || "not recorded"}
                  </span>
                </div>

                <span className="settings-backup-preview-badge">
                  {packageIsRestorable ? "Ready for restore" : "Review only"}
                </span>
              </div>

              <div className="settings-backup-count-grid">
                {restorePreview.table_counts.map((table) => (
                  <div key={table.key} className="settings-backup-count-card">
                    <span className="settings-backup-count-label">{table.label}</span>
                    <strong>{table.count.toLocaleString()}</strong>
                  </div>
                ))}
              </div>

              {canRestoreClinicBackup ? (
                <button
                  type="button"
                  className="small-button settings-restore-button"
                  onClick={handleOpenRestoreConfirmation}
                  disabled={!packageIsRestorable || isRestoringBackup}
                >
                  Restore this backup
                </button>
              ) : (
                <p className="settings-module-inline-note">
                  Staff can export and review backups. Only an Admin can perform a restore.
                </p>
              )}
            </div>
          ) : (
            <div className="empty-state">
              Choose a JSON backup to inspect its table counts before restoring anything.
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">Only Admin or Staff can use backup tools.</div>
      )}

      {isRestoreConfirmationOpen && (
        <div className="settings-confirm-overlay" role="presentation">
          <div
            className="settings-confirm-modal settings-restore-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-restore-title"
          >
            <span className="settings-clinic-kicker">Admin confirmation</span>
            <h4 id="settings-restore-title">Restore this clinic backup?</h4>
            <p>
              This merge can overwrite records with matching IDs. Sign-in and fresh MFA are
              required. Type <strong>RESTORE</strong> to continue.
            </p>
            <input
              className="search-input"
              value={restoreConfirmationText}
              onChange={(event) => setRestoreConfirmationText(event.target.value)}
              placeholder="Type RESTORE"
              autoFocus
              disabled={isRestoringBackup}
            />
            <div className="settings-confirm-actions">
              <button
                type="button"
                className="small-button settings-confirm-secondary"
                onClick={handleCloseRestoreConfirmation}
                disabled={isRestoringBackup}
              >
                Cancel
              </button>
              <button
                type="button"
                className="small-button settings-confirm-danger"
                onClick={() => void handleConfirmRestore()}
                disabled={isRestoringBackup || restoreConfirmationText.trim().toUpperCase() !== "RESTORE"}
              >
                {isRestoringBackup ? "Restoring…" : "Restore records"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
