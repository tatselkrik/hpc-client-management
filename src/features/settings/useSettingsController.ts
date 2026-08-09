import type {
  Profile,
  Section,
  WriteAuditLog,
} from "../../appShared";
import type { SettingsSectionProps } from "./SettingsSection";
import { useAuditLogs } from "./useAuditLogs";
import { useBackupTools } from "./useBackupTools";
import { useClinicInfo } from "./useClinicInfo";
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
  canManageClientCategoriesAndBackups: boolean;
  canViewAuditLogs: boolean;
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
  canManageClientCategoriesAndBackups,
  canViewAuditLogs,
  canManageDashboardAnnouncements,
  profile,
  userEmail,
  loading,
  setLoading,
  writeAuditLog,
}: UseSettingsControllerOptions) {
  const { themeMode, setThemeMode } = useThemeMode();
  const clinicInfoController = useClinicInfo({
    activeSection,
    canManageClinicInfo: canManageClientCategoriesAndBackups,
    profile,
    writeAuditLog,
  });
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
    canManageCareTeam: canViewAuditLogs,
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
    isRestoringBackup,
    canRestoreClinicBackup,
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
  } = useBackupTools({
    canManageCareTeam: canManageClientCategoriesAndBackups,
    profile,
    userEmail,
  });

  const settingsPropsBase: SettingsControllerPropsBase = {
    ...clinicInfoController,
    canManageClinicInfo: canManageClientCategoriesAndBackups,
    canManageDashboardAnnouncements,
    dashboardAnnouncement,
    setDashboardAnnouncement,
    dashboardAnnouncementStatus,
    canManageLoading: loading,
    handleSaveDashboardAnnouncement,
    handleClearDashboardAnnouncement,
    themeMode,
    setThemeMode,
    canManageClientCategoriesAndBackups,
    canViewAuditLogs,
    isExportingBackup,
    isRestoringBackup,
    canRestoreClinicBackup,
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
    handleRefreshAuditLogs: () => loadAuditLogs(auditLogFilter),
  };

  return {
    ...clinicInfoController,
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
    isRestoringBackup,
    canRestoreClinicBackup,
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
    settingsPropsBase: settingsPropsBase as Omit<SettingsSectionProps, keyof ClientCategorySettingsControls>,
  };
}

export type SettingsController = ReturnType<typeof useSettingsController>;
