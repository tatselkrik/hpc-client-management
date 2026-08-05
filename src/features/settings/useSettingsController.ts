import type {
  Profile,
  Section,
  WriteAuditLog,
} from "../../appShared";
import type { SettingsSectionProps } from "./SettingsSection";
import { useAuditLogs } from "./useAuditLogs";
import { useBackupTools } from "./useBackupTools";
import { useSettingsAnnouncement } from "./useSettingsAnnouncement";
import { useThemeMode } from "./useThemeMode";

export type ClientCategorySettingsControls = Pick<
  SettingsSectionProps,
  | "clientCategories"
  | "clientCategoryDraft"
  | "setClientCategoryDraft"
  | "clientCategoryStatus"
  | "editingClientCategoryId"
  | "editingClientCategoryName"
  | "setEditingClientCategoryName"
  | "handleAddClientCategory"
  | "handleStartEditClientCategory"
  | "handleCancelEditClientCategory"
  | "handleUpdateClientCategory"
  | "handleDeleteClientCategory"
>;

type UseSettingsControllerOptions = {
  activeSection: Section;
  canManageCareTeam: boolean;
  canManageDashboardAnnouncements: boolean;
  profile: Profile | null;
  userEmail: string | null;
  loading: boolean;
  setLoading: (value: boolean) => void;
  writeAuditLog: WriteAuditLog;
};

type SettingsControllerPropsBase = Omit<
  SettingsSectionProps,
  keyof ClientCategorySettingsControls
>;

export function useSettingsController({
  activeSection,
  canManageCareTeam,
  canManageDashboardAnnouncements,
  profile,
  userEmail,
  loading,
  setLoading,
  writeAuditLog,
}: UseSettingsControllerOptions) {
  const { themeMode, setThemeMode } = useThemeMode();
  const {
    auditLogEntries,
    auditLogFilter,
    setAuditLogFilter,
    auditLogStatus,
    isAuditLogLoading,
    loadAuditLogs,
    resetAuditLogs,
  } = useAuditLogs({
    activeSection,
    canManageCareTeam,
    userEmail,
  });

  const {
    dashboardAnnouncement,
    setDashboardAnnouncement,
    dashboardAnnouncementStatus,
    setDashboardAnnouncementStatus,
    dismissedAnnouncementKey,
    loadDashboardAnnouncement,
    handleSaveDashboardAnnouncement,
    handleClearDashboardAnnouncement,
    handleDismissDashboardAnnouncement,
  } = useSettingsAnnouncement({
    canManageDashboardAnnouncements,
    setLoading,
    writeAuditLog,
  });

  const {
    backupToolsStatus,
    isExportingBackup,
    restorePreview,
    backupRestoreInputRef,
    handleExportClinicBackup,
    handleChooseRestorePackage,
    handleRestorePackageSelected,
  } = useBackupTools({
    canManageCareTeam,
    profile,
    userEmail,
  });

  const settingsPropsBase: SettingsControllerPropsBase = {
    canManageDashboardAnnouncements,
    dashboardAnnouncement,
    setDashboardAnnouncement,
    dashboardAnnouncementStatus,
    canManageLoading: loading,
    handleSaveDashboardAnnouncement,
    handleClearDashboardAnnouncement,
    themeMode,
    setThemeMode,
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
    handleRefreshAuditLogs: () => loadAuditLogs(auditLogFilter),
  };

  return {
    themeMode,
    setThemeMode,
    auditLogEntries,
    auditLogFilter,
    setAuditLogFilter,
    auditLogStatus,
    isAuditLogLoading,
    loadAuditLogs,
    resetAuditLogs,
    dashboardAnnouncement,
    setDashboardAnnouncement,
    dashboardAnnouncementStatus,
    setDashboardAnnouncementStatus,
    dismissedAnnouncementKey,
    loadDashboardAnnouncement,
    handleSaveDashboardAnnouncement,
    handleClearDashboardAnnouncement,
    handleDismissDashboardAnnouncement,
    backupToolsStatus,
    isExportingBackup,
    restorePreview,
    backupRestoreInputRef,
    handleExportClinicBackup,
    handleChooseRestorePackage,
    handleRestorePackageSelected,
    settingsPropsBase: settingsPropsBase as Omit<SettingsSectionProps, keyof ClientCategorySettingsControls>,
  };
}

export type SettingsController = ReturnType<typeof useSettingsController>;
