import type {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";

import type {
  AuditLogEntry,
  AuditLogFilterRange,
  BackupRestorePreview,
  DashboardAnnouncement,
  ThemeMode,
  ClientCategory,
} from "../../appShared";

import { SettingsAnnouncementCard } from "./SettingsAnnouncementCard";
import { SettingsAppearanceCard } from "./SettingsAppearanceCard";
import { SettingsAuditLogCard } from "./SettingsAuditLogCard";
import { SettingsBackupRestoreCard } from "./SettingsBackupRestoreCard";
import { SettingsClinicInfoCard } from "./SettingsClinicInfoCard";
import { SettingsClientCategoriesCard } from "./SettingsClientCategoriesCard";

export type SettingsSectionProps = {
  canManageDashboardAnnouncements: boolean;
  dashboardAnnouncement: DashboardAnnouncement;
  setDashboardAnnouncement: Dispatch<SetStateAction<DashboardAnnouncement>>;
  dashboardAnnouncementStatus: string;
  canManageLoading: boolean;
  handleSaveDashboardAnnouncement: () => void | Promise<void>;
  handleClearDashboardAnnouncement: () => void | Promise<void>;

  themeMode: ThemeMode;
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;

  clientCategories: ClientCategory[];
  clientCategoryDraft: string;
  setClientCategoryDraft: Dispatch<SetStateAction<string>>;
  clientCategoryStatus: string;
  editingClientCategoryId: string;
  editingClientCategoryName: string;
  setEditingClientCategoryName: Dispatch<SetStateAction<string>>;
  handleAddClientCategory: () => void | Promise<void>;
  handleStartEditClientCategory: (category: ClientCategory) => void;
  handleCancelEditClientCategory: () => void;
  handleUpdateClientCategory: (category: ClientCategory) => void | Promise<void>;
  handleDeleteClientCategory: (category: ClientCategory) => void | Promise<void>;

  canManageCareTeam: boolean;
  isExportingBackup: boolean;
  backupToolsStatus: string;
  restorePreview: BackupRestorePreview | null;
  backupRestoreInputRef: RefObject<HTMLInputElement | null>;
  handleExportClinicBackup: () => void | Promise<void>;
  handleChooseRestorePackage: () => void;
  handleRestorePackageSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;

  auditLogFilter: AuditLogFilterRange;
  setAuditLogFilter: (filter: AuditLogFilterRange) => void;
  isAuditLogLoading: boolean;
  auditLogEntries: AuditLogEntry[];
  auditLogStatus: string;
  handleRefreshAuditLogs: () => void | Promise<void>;
};

export function SettingsSection({
  canManageDashboardAnnouncements,
  dashboardAnnouncement,
  setDashboardAnnouncement,
  dashboardAnnouncementStatus,
  canManageLoading,
  handleSaveDashboardAnnouncement,
  handleClearDashboardAnnouncement,
  themeMode,
  setThemeMode,
  clientCategories,
  clientCategoryDraft,
  setClientCategoryDraft,
  clientCategoryStatus,
  editingClientCategoryId,
  editingClientCategoryName,
  setEditingClientCategoryName,
  handleAddClientCategory,
  handleStartEditClientCategory,
  handleCancelEditClientCategory,
  handleUpdateClientCategory,
  handleDeleteClientCategory,
  canManageCareTeam,
  isExportingBackup,
  backupToolsStatus,
  restorePreview,
  backupRestoreInputRef,
  handleExportClinicBackup,
  handleChooseRestorePackage,
  handleRestorePackageSelected,
  auditLogFilter,
  setAuditLogFilter,
  isAuditLogLoading,
  auditLogEntries,
  auditLogStatus,
  handleRefreshAuditLogs,
}: SettingsSectionProps) {
  return (
    <div className="page-content">
      <h2>Settings</h2>

      <div className="settings-layout">
        <div className="panel settings-panel">
          <div className="settings-module-grid">
            <div className="settings-module-row settings-module-row-top">
              <SettingsClinicInfoCard />

              <SettingsAppearanceCard
                themeMode={themeMode}
                setThemeMode={setThemeMode}
              />
            </div>

            {canManageDashboardAnnouncements && (
              <SettingsAnnouncementCard
                canManageDashboardAnnouncements={canManageDashboardAnnouncements}
                dashboardAnnouncement={dashboardAnnouncement}
                setDashboardAnnouncement={setDashboardAnnouncement}
                dashboardAnnouncementStatus={dashboardAnnouncementStatus}
                canManageLoading={canManageLoading}
                handleSaveDashboardAnnouncement={handleSaveDashboardAnnouncement}
                handleClearDashboardAnnouncement={handleClearDashboardAnnouncement}
              />
            )}

            {canManageCareTeam && (
              <div className="settings-module-row settings-module-row-middle">
                <SettingsClientCategoriesCard
                  canManageCareTeam={canManageCareTeam}
                  clientCategories={clientCategories}
                  clientCategoryDraft={clientCategoryDraft}
                  setClientCategoryDraft={setClientCategoryDraft}
                  clientCategoryStatus={clientCategoryStatus}
                  editingClientCategoryId={editingClientCategoryId}
                  editingClientCategoryName={editingClientCategoryName}
                  setEditingClientCategoryName={setEditingClientCategoryName}
                  handleAddClientCategory={handleAddClientCategory}
                  handleStartEditClientCategory={handleStartEditClientCategory}
                  handleCancelEditClientCategory={handleCancelEditClientCategory}
                  handleUpdateClientCategory={handleUpdateClientCategory}
                  handleDeleteClientCategory={handleDeleteClientCategory}
                />

                <SettingsBackupRestoreCard
                  canManageCareTeam={canManageCareTeam}
                  isExportingBackup={isExportingBackup}
                  backupToolsStatus={backupToolsStatus}
                  restorePreview={restorePreview}
                  backupRestoreInputRef={backupRestoreInputRef}
                  handleExportClinicBackup={handleExportClinicBackup}
                  handleChooseRestorePackage={handleChooseRestorePackage}
                  handleRestorePackageSelected={handleRestorePackageSelected}
                />
              </div>
            )}

            {canManageCareTeam && (
              <SettingsAuditLogCard
                canManageCareTeam={canManageCareTeam}
                auditLogFilter={auditLogFilter}
                setAuditLogFilter={setAuditLogFilter}
                isAuditLogLoading={isAuditLogLoading}
                auditLogEntries={auditLogEntries}
                auditLogStatus={auditLogStatus}
                handleRefreshAuditLogs={handleRefreshAuditLogs}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
