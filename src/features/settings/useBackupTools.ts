import { ChangeEvent, useRef, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";

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
  const [restorePreview, setRestorePreview] = useState<BackupRestorePreview | null>(null);

  const handleExportClinicBackup = async () => {
    if (!canManageCareTeam) {
      setBackupToolsStatus(feedbackMessages.permissionDenied("Only Admin accounts can export clinic backups."));
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
      const payload = {
        product_name: APP_PRODUCT_NAME,
        exported_at: exportedAt,
        exported_by: profile?.full_name?.trim() || userEmail || "Unknown user",
        source: "settings-backup-tools",
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
        table_counts: tableResults.map((table) => ({
          key: table.key,
          label: table.label,
          count: table.rows.length,
        })),
      });
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
        exported_at?: unknown;
        product_name?: unknown;
        tables?: Record<string, unknown>;
      };

      if (!parsed || typeof parsed !== "object" || !parsed.tables || typeof parsed.tables !== "object") {
        throw new Error("The selected file is not a valid HPC clinic backup package.");
      }

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
        table_counts: previewCounts,
      });
      setBackupToolsStatus("Restore package reviewed. No database changes were made.");
    } catch (error) {
      const message = getErrorDetail(error);
      setRestorePreview(null);
      setBackupToolsStatus(feedbackMessages.error("We could not review this restore package.", message));
    } finally {
      event.target.value = "";
    }
  };

  return {
    backupToolsStatus,
    isExportingBackup,
    restorePreview,
    backupRestoreInputRef,
    handleExportClinicBackup,
    handleChooseRestorePackage,
    handleRestorePackageSelected,
  };
}
