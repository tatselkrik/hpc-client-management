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
  ClinicInfo,
  DashboardAnnouncement,
  ThemeMode,
  ClientCategory,
} from "../../appShared";

import { SettingsAnnouncementCard } from "./SettingsAnnouncementCard";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { SettingsAppearanceCard } from "./SettingsAppearanceCard";
import { SettingsAuditLogCard } from "./SettingsAuditLogCard";
import { SettingsBackupRestoreCard } from "./SettingsBackupRestoreCard";
import { SettingsClinicInfoCard } from "./SettingsClinicInfoCard";
import { SettingsClientCategoriesCard } from "./SettingsClientCategoriesCard";

export type SettingsSectionProps = {
  clinicInfo: ClinicInfo;
  clinicInfoDraft: ClinicInfo;
  setClinicInfoDraft: Dispatch<SetStateAction<ClinicInfo>>;
  clinicInfoStatus: string;
  canManageClinicInfo: boolean;
  isClinicInfoEditing: boolean;
  isClinicInfoSaving: boolean;
  handleStartClinicInfoEdit: () => void;
  handleCancelClinicInfoEdit: () => void;
  handleSaveClinicInfo: () => void | Promise<void>;

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

  canManageClientCategoriesAndBackups: boolean;
  canViewAuditLogs: boolean;
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

  auditLogFilter: AuditLogFilterRange;
  setAuditLogFilter: (filter: AuditLogFilterRange) => void;
  isAuditLogLoading: boolean;
  auditLogEntries: AuditLogEntry[];
  auditLogStatus: string;
  handleRefreshAuditLogs: () => void | Promise<void>;
};

export function SettingsSection({
  clinicInfo,
  clinicInfoDraft,
  setClinicInfoDraft,
  clinicInfoStatus,
  canManageClinicInfo,
  isClinicInfoEditing,
  isClinicInfoSaving,
  handleStartClinicInfoEdit,
  handleCancelClinicInfoEdit,
  handleSaveClinicInfo,
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
  canManageClientCategoriesAndBackups,
  canViewAuditLogs,
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
  auditLogFilter,
  setAuditLogFilter,
  isAuditLogLoading,
  auditLogEntries,
  auditLogStatus,
  handleRefreshAuditLogs,
}: SettingsSectionProps) {
  return (
    <div className="page-content settings-page">
      <WorkspaceHeader
        eyebrow="Workspace configuration"
        title="Settings"
        description="Manage clinic information, appearance, announcements, categories, backups, and the controls available to your role."
        meta={
          <>
            <strong>Clinic controls</strong>
            <span>Available modules follow your account permissions</span>
          </>
        }
      />

      <div className="settings-layout">
        <div className="settings-panel">
          <div className="settings-module-grid">
            <div className="settings-module-row settings-module-row-top">
              <SettingsClinicInfoCard
                clinicInfo={clinicInfo}
                clinicInfoDraft={clinicInfoDraft}
                setClinicInfoDraft={setClinicInfoDraft}
                clinicInfoStatus={clinicInfoStatus}
                canManageClinicInfo={canManageClinicInfo}
                isClinicInfoEditing={isClinicInfoEditing}
                isClinicInfoSaving={isClinicInfoSaving}
                handleStartClinicInfoEdit={handleStartClinicInfoEdit}
                handleCancelClinicInfoEdit={handleCancelClinicInfoEdit}
                handleSaveClinicInfo={handleSaveClinicInfo}
              />

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

            {canManageClientCategoriesAndBackups && (
              <div className="settings-module-row settings-module-row-middle">
                <SettingsClientCategoriesCard
                  canManageCareTeam={canManageClientCategoriesAndBackups}
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
                  canManageCareTeam={canManageClientCategoriesAndBackups}
                  canRestoreClinicBackup={canRestoreClinicBackup}
                  isExportingBackup={isExportingBackup}
                  isRestoringBackup={isRestoringBackup}
                  backupToolsStatus={backupToolsStatus}
                  restorePreview={restorePreview}
                  isRestoreConfirmationOpen={isRestoreConfirmationOpen}
                  restoreConfirmationText={restoreConfirmationText}
                  setRestoreConfirmationText={setRestoreConfirmationText}
                  backupRestoreInputRef={backupRestoreInputRef}
                  handleExportClinicBackup={handleExportClinicBackup}
                  handleChooseRestorePackage={handleChooseRestorePackage}
                  handleRestorePackageSelected={handleRestorePackageSelected}
                  handleOpenRestoreConfirmation={handleOpenRestoreConfirmation}
                  handleCloseRestoreConfirmation={handleCloseRestoreConfirmation}
                  handleConfirmRestore={handleConfirmRestore}
                />
              </div>
            )}

            {canViewAuditLogs && (
              <SettingsAuditLogCard
                canManageCareTeam={canViewAuditLogs}
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
