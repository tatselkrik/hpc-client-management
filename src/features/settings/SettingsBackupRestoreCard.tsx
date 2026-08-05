import { StatusMessage } from "../../components/StatusMessage";
import { SectionHeader } from "../../components/SectionHeader";
import type { ChangeEvent, RefObject } from "react";

import type { BackupRestorePreview } from "../../appShared";
import { formatAuditTimestamp } from "../../appShared";

type SettingsBackupRestoreCardProps = {
  canManageCareTeam: boolean;
  isExportingBackup: boolean;
  backupToolsStatus: string;
  restorePreview: BackupRestorePreview | null;
  backupRestoreInputRef: RefObject<HTMLInputElement | null>;
  handleExportClinicBackup: () => void | Promise<void>;
  handleChooseRestorePackage: () => void;
  handleRestorePackageSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

export function SettingsBackupRestoreCard({
  canManageCareTeam,
  isExportingBackup,
  backupToolsStatus,
  restorePreview,
  backupRestoreInputRef,
  handleExportClinicBackup,
  handleChooseRestorePackage,
  handleRestorePackageSelected,
}: SettingsBackupRestoreCardProps) {
  return (
    <section className="settings-module-card">
      <SectionHeader
        className="settings-module-header"
        kicker="Backup review"
        title="Backup and review tools"
        titleClassName="settings-module-title"
        actions={<span className="settings-module-badge live">Live</span>}
      />

      <p className="settings-module-copy">
        Export a structured clinic backup package and review a selected backup file safely.
        Backup review is read-only and does not change database records.
      </p>

      {canManageCareTeam ? (
        <div className="settings-backup-tools">
          <div className="settings-backup-safety-note">
            <strong>Safety note</strong>
            <span>
              The review button only checks package contents and table counts. It does not apply
              records back into the database.
            </span>
          </div>

          <div className="settings-backup-actions">
            <button
              type="button"
              className="small-button"
              onClick={() => void handleExportClinicBackup()}
              disabled={isExportingBackup}
            >
              {isExportingBackup ? "Exporting backup..." : "Export backup (.json)"}
            </button>

            <button
              type="button"
              className="small-button settings-backup-secondary-button"
              onClick={handleChooseRestorePackage}
              disabled={isExportingBackup}
            >
              Review backup package
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
            <StatusMessage
              className="settings-backup-status"
              message={backupToolsStatus}
            />
          ) : (
            <p className="settings-backup-status">
              Info: Backups save the latest clinic data. Review mode lets you inspect a backup without changing anything.
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
                </div>

                <span className="settings-backup-preview-badge">Reviewed package</span>
              </div>

              <div className="settings-backup-count-grid">
                {restorePreview.table_counts.map((table) => (
                  <div key={table.key} className="settings-backup-count-card">
                    <span className="settings-backup-count-label">{table.label}</span>
                    <strong>{table.count.toLocaleString()}</strong>
                  </div>
                ))}
              </div>

              <p className="settings-module-inline-note">
                Review complete. No database changes were made.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              Choose a JSON backup file to review table counts before any manual follow-up action.
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          Only Admin can export backups or review backup packages.
        </div>
      )}

      <p className="settings-module-inline-note">
      </p>
    </section>
  );
}
