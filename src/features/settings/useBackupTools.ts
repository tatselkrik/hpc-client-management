import { ChangeEvent, useRef, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { getSupabaseFunctionErrorMessage } from "../../lib/supabaseFunctionErrors";

import type {
  BackupRestorePreview,
  Profile,
} from "../../appShared";
import {
  APP_PRODUCT_NAME,
  BACKUP_TABLE_CONFIG,
  sanitizeFileName,
} from "../../appShared";

type UseBackupToolsOptions = {
  canManageCareTeam: boolean;
  profile: Profile | null;
  userEmail: string | null;
};

const MAX_RESTORE_REVIEW_BYTES = 25 * 1024 * 1024;

const BACKUP_EXPORT_PAGE_SIZE = 1000;
const BACKUP_FORMAT_VERSION = 2;

type ClinicBackupPackage = {
  format_version: number;
  export_id: string;
  product_name: string;
  exported_at: string;
  exported_by: string;
  source: string;
  source_project_ref: string;
  tables: Record<string, Record<string, unknown>[]>;
};

type BackupTableKey = (typeof BACKUP_TABLE_CONFIG)[number]["key"];

const fetchBackupTableRows = async (tableKey: BackupTableKey) => {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const to = from + BACKUP_EXPORT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(tableKey)
      .select("*")
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as Record<string, unknown>[];
    rows.push(...pageRows);

    if (pageRows.length < BACKUP_EXPORT_PAGE_SIZE) {
      return rows;
    }

    from += BACKUP_EXPORT_PAGE_SIZE;
  }
};


export function useBackupTools({
  canManageCareTeam,
  profile,
  userEmail,
}: UseBackupToolsOptions) {
  const backupRestoreInputRef = useRef<HTMLInputElement | null>(null);
  const [backupToolsStatus, setBackupToolsStatus] = useState("");
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restorePreview, setRestorePreview] = useState<BackupRestorePreview | null>(null);
  const [restorePackage, setRestorePackage] = useState<ClinicBackupPackage | null>(null);
  const [isRestoreConfirmationOpen, setIsRestoreConfirmationOpen] = useState(false);
  const [restoreConfirmationText, setRestoreConfirmationText] = useState("");
  const canRestoreClinicBackup = profile?.role?.trim().toLowerCase() === "admin";

  const handleExportClinicBackup = async () => {
    if (!canManageCareTeam) {
      setBackupToolsStatus(feedbackMessages.permissionDenied("Only Admin or Staff accounts can export clinic backups."));
      return;
    }

    setIsExportingBackup(true);
    setBackupToolsStatus(feedbackMessages.loading("Preparing backup export"));

    try {
      const tableResults = [];

      for (const table of BACKUP_TABLE_CONFIG) {
        setBackupToolsStatus(feedbackMessages.loading(`Exporting ${table.label}`));

        try {
          tableResults.push({
            key: table.key,
            label: table.label,
            rows: await fetchBackupTableRows(table.key),
          });
        } catch (error) {
          const message = getErrorDetail(error);
          throw new Error(`Unable to export ${table.label}: ${message}`);
        }
      }

      const exportedAt = new Date().toISOString();
      const sourceProjectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0];
      const payload: ClinicBackupPackage = {
        format_version: BACKUP_FORMAT_VERSION,
        export_id: crypto.randomUUID(),
        product_name: APP_PRODUCT_NAME,
        exported_at: exportedAt,
        exported_by: profile?.full_name?.trim() || userEmail || "Unknown user",
        source: "settings-backup-tools",
        source_project_ref: sourceProjectRef,
        tables: Object.fromEntries(tableResults.map((table) => [table.key, table.rows])),
      };

      const fileName = sanitizeFileName(
        `hpc-clinic-backup-${exportedAt.replace(/[:]/g, "-").replace(/\.\d+Z$/, "Z")}.json`
      );

      let savedLocationLabel = fileName;

      try {
        const selectedSavePath = await save({
          title: "Save clinic backup",
          defaultPath: fileName,
          filters: [{ name: "JSON Backup", extensions: ["json"] }],
        });

        if (!selectedSavePath) {
          setBackupToolsStatus(feedbackMessages.cancelled("backup export"));
          setIsExportingBackup(false);
          return;
        }

        const finalSavePath =
          selectedSavePath.toLowerCase().endsWith(".json")
            ? selectedSavePath
            : `${selectedSavePath}.json`;

        await writeFile(finalSavePath, new TextEncoder().encode(JSON.stringify(payload, null, 2)));
        savedLocationLabel = finalSavePath;
      } catch (saveDialogError) {
        const message = getErrorDetail(saveDialogError);

        setBackupToolsStatus(feedbackMessages.error("We could not create the backup.", message));
        setIsExportingBackup(false);
        return;
      }

      setRestorePreview({
        file_name: fileName,
        exported_at: exportedAt,
        product_name: APP_PRODUCT_NAME,
        format_version: BACKUP_FORMAT_VERSION,
        source_project_ref: sourceProjectRef,
        table_counts: tableResults.map((table) => ({
          key: table.key,
          label: table.label,
          count: table.rows.length,
        })),
      });
      setRestorePackage(payload);
      setBackupToolsStatus(`Backup saved to ${savedLocationLabel}.`);
    } catch (error) {
      const message = getErrorDetail(error);
      setBackupToolsStatus(feedbackMessages.error("We could not create the backup.", message));
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleChooseRestorePackage = () => {
    backupRestoreInputRef.current?.click();
  };

  const handleRestorePackageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setBackupToolsStatus(feedbackMessages.loading("Reviewing restore package"));

    try {
      if (!selectedFile.name.toLowerCase().endsWith(".json")) {
        throw new Error("Choose a .json backup package.");
      }

      if (selectedFile.size > MAX_RESTORE_REVIEW_BYTES) {
        throw new Error("The selected package is too large to review in the app.");
      }

      const rawText = await selectedFile.text();
      const parsed = JSON.parse(rawText) as {
        format_version?: unknown;
        export_id?: unknown;
        exported_at?: unknown;
        exported_by?: unknown;
        product_name?: unknown;
        source?: unknown;
        source_project_ref?: unknown;
        tables?: Record<string, unknown>;
      };

      if (!parsed || typeof parsed !== "object" || !parsed.tables || typeof parsed.tables !== "object") {
        throw new Error("The selected file is not a valid HPC clinic backup package.");
      }

      const formatVersion =
        typeof parsed.format_version === "number" ? parsed.format_version : 1;
      const sourceProjectRef =
        typeof parsed.source_project_ref === "string" ? parsed.source_project_ref : "";

      const previewCounts = BACKUP_TABLE_CONFIG.map((table) => {
        const tableValue = parsed.tables?.[table.key];
        return {
          key: table.key,
          label: table.label,
          count: Array.isArray(tableValue) ? tableValue.length : 0,
        };
      });

      setRestorePreview({
        file_name: selectedFile.name,
        exported_at:
          typeof parsed.exported_at === "string" ? parsed.exported_at : new Date().toISOString(),
        product_name:
          typeof parsed.product_name === "string" && parsed.product_name.trim()
            ? parsed.product_name
            : APP_PRODUCT_NAME,
        format_version: formatVersion,
        source_project_ref: sourceProjectRef,
        table_counts: previewCounts,
      });
      if (formatVersion === BACKUP_FORMAT_VERSION && sourceProjectRef) {
        setRestorePackage(parsed as ClinicBackupPackage);
        setBackupToolsStatus("Backup package reviewed and ready for an Admin restore.");
      } else {
        setRestorePackage(null);
        setBackupToolsStatus(
          "Backup package reviewed. This legacy package can be inspected, but it cannot be restored automatically.",
        );
      }
    } catch (error) {
      const message = getErrorDetail(error);
      setRestorePreview(null);
      setRestorePackage(null);
      setBackupToolsStatus(feedbackMessages.error("We could not review this restore package.", message));
    } finally {
      event.target.value = "";
    }
  };

  const handleOpenRestoreConfirmation = () => {
    if (!canRestoreClinicBackup) {
      setBackupToolsStatus(feedbackMessages.permissionDenied("Only an Admin can restore a clinic backup."));
      return;
    }
    if (!restorePackage) {
      setBackupToolsStatus(feedbackMessages.error("A restorable backup package has not been selected."));
      return;
    }

    setRestoreConfirmationText("");
    setIsRestoreConfirmationOpen(true);
  };

  const handleCloseRestoreConfirmation = () => {
    if (isRestoringBackup) return;
    setRestoreConfirmationText("");
    setIsRestoreConfirmationOpen(false);
  };

  const handleConfirmRestore = async () => {
    if (!canRestoreClinicBackup || !restorePackage) return;
    if (restoreConfirmationText.trim().toUpperCase() !== "RESTORE") {
      setBackupToolsStatus(feedbackMessages.error("Type RESTORE to confirm the merge restore."));
      return;
    }

    setIsRestoringBackup(true);
    setBackupToolsStatus(feedbackMessages.loading("Restoring clinic records"));

    try {
      const { data, error } = await supabase.functions.invoke("restore-clinic-backup", {
        body: restorePackage,
      });

      if (error) throw new Error(await getSupabaseFunctionErrorMessage(error));
      if (!data?.ok) throw new Error(data?.error || "The restore service did not confirm completion.");

      setBackupToolsStatus(
        "Backup restored in merge mode. Matching records were updated, missing records were added, and no current records were deleted.",
      );
      setIsRestoreConfirmationOpen(false);
      setRestoreConfirmationText("");
    } catch (error) {
      setBackupToolsStatus(
        feedbackMessages.error("We could not restore this backup.", getErrorDetail(error)),
      );
    } finally {
      setIsRestoringBackup(false);
    }
  };

  return {
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
  };
}
