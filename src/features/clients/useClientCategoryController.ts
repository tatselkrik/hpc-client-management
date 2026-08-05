import type {
  ClientListItem,
  WriteAuditLog,
} from "../../appShared";
import type { ClientCategorySettingsControls } from "../settings/useSettingsController";
import { useClientCategoryManagement } from "../settings/useClientCategoryManagement";

type UseClientCategoryControllerOptions = {
  canManageClientCategories: boolean;
  clientRows: ClientListItem[];
  writeAuditLog: WriteAuditLog;
};

export function useClientCategoryController({
  canManageClientCategories,
  clientRows,
  writeAuditLog,
}: UseClientCategoryControllerOptions) {
  const categoryManagement = useClientCategoryManagement({
    canManageClientCategories,
    clientRows,
    writeAuditLog,
  });

  const {
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
  } = categoryManagement;

  const clientCategorySettingsProps: ClientCategorySettingsControls = {
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
  };

  return {
    ...categoryManagement,
    clientCategorySettingsProps,
  };
}
