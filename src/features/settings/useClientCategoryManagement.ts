import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type { ClientCategory, ClientListItem } from "../../appShared";
import {
  CATEGORY_PATH_OPTIONS,
  mergeClientCategoryOptions,
  normalizeCategoryName,
} from "../../appShared";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseClientCategoryManagementOptions = {
  canManageClientCategories: boolean;
  clientRows: ClientListItem[];
  writeAuditLog: WriteAuditLog;
};

export function useClientCategoryManagement({
  canManageClientCategories,
  clientRows,
  writeAuditLog,
}: UseClientCategoryManagementOptions) {
  const [clientCategories, setClientCategories] = useState<ClientCategory[]>([]);
  const [clientCategoryDraft, setClientCategoryDraft] = useState("");
  const [clientCategoryStatus, setClientCategoryStatus] = useState("");
  const [editingClientCategoryId, setEditingClientCategoryId] = useState("");
  const [editingClientCategoryName, setEditingClientCategoryName] = useState("");

  const clientCategoryOptions = useMemo(
    () =>
      mergeClientCategoryOptions(
        [
          ...CATEGORY_PATH_OPTIONS,
          ...clientCategories.map((category) => category.name),
        ],
        clientRows
          .map((client) => client.category_path)
          .filter((value): value is string => typeof value === "string")
      ),
    [clientCategories, clientRows]
  );

  const loadClientCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_categories")
      .select("id, name, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      setClientCategoryStatus(feedbackMessages.loadFailed("client categories", error.message));
      return;
    }

    const rows = (data ?? [])
      .map((category) => ({
        id: String(category.id),
        name: normalizeCategoryName(String(category.name ?? "")),
        created_at: category.created_at ?? null,
        updated_at: category.updated_at ?? null,
      }))
      .filter((category) => category.name !== "");

    setClientCategories(rows);
    setClientCategoryStatus("");
  }, []);

  const handleAddClientCategory = useCallback(async () => {
    if (!canManageClientCategories) {
      setClientCategoryStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can manage client categories."));
      return;
    }

    const nextName = normalizeCategoryName(clientCategoryDraft);

    if (nextName === "") {
      setClientCategoryStatus(feedbackMessages.required("category name"));
      return;
    }

    if (
      clientCategoryOptions.some(
        (option) => option.toLowerCase() === nextName.toLowerCase()
      )
    ) {
      setClientCategoryStatus(`${nextName} already exists.`);
      return;
    }

    setClientCategoryStatus(feedbackMessages.loading(`Adding ${nextName}`));

    const { error } = await supabase.from("client_categories").insert({ name: nextName });

    if (error) {
      setClientCategoryStatus(feedbackMessages.addFailed("client category", error.message));
      return;
    }

    setClientCategories((current) => {
      if (current.some((category) => category.name.toLowerCase() === nextName.toLowerCase())) {
        return current;
      }

      return [
        ...current,
        {
          id: nextName,
          name: nextName,
          created_at: null,
          updated_at: null,
        },
      ].sort((left, right) => left.name.localeCompare(right.name));
    });

    setClientCategoryDraft("");
    await loadClientCategories();
    await writeAuditLog("Settings", "Client Category Added", "client_category", null, nextName, {
      summary: `Added client category "${nextName}".`,
    });
    setClientCategoryStatus(`${nextName} added.`);
  }, [
    canManageClientCategories,
    clientCategoryDraft,
    clientCategoryOptions,
    loadClientCategories,
    writeAuditLog,
  ]);

  const handleStartEditClientCategory = useCallback((category: ClientCategory) => {
    setEditingClientCategoryId(category.id);
    setEditingClientCategoryName(category.name);
    setClientCategoryStatus("");
  }, []);

  const handleCancelEditClientCategory = useCallback(() => {
    setEditingClientCategoryId("");
    setEditingClientCategoryName("");
  }, []);

  const handleUpdateClientCategory = useCallback(
    async (category: ClientCategory) => {
      if (!canManageClientCategories) {
        setClientCategoryStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can manage client categories."));
        return;
      }

      const nextName = normalizeCategoryName(editingClientCategoryName);

      if (nextName === "") {
        setClientCategoryStatus(feedbackMessages.required("category name"));
        return;
      }

      const duplicate = clientCategories.some(
        (item) =>
          item.id !== category.id &&
          item.name.toLowerCase() === nextName.toLowerCase()
      );

      if (duplicate) {
        setClientCategoryStatus(`${nextName} already exists.`);
        return;
      }

      setClientCategoryStatus(feedbackMessages.loading(`Updating ${category.name}`));

      const { error } = await supabase
        .from("client_categories")
        .update({ name: nextName, updated_at: new Date().toISOString() })
        .eq("id", category.id);

      if (error) {
        setClientCategoryStatus(feedbackMessages.updateFailed("client category", error.message));
        return;
      }

      setEditingClientCategoryId("");
      setEditingClientCategoryName("");
      await loadClientCategories();
      await writeAuditLog("Settings", "Client Category Updated", "client_category", category.id, nextName, {
        summary: `Renamed client category "${category.name}" to "${nextName}".`,
        previous_name: category.name,
        next_name: nextName,
      });
      setClientCategoryStatus(`${nextName} updated.`);
    },
    [
      canManageClientCategories,
      clientCategories,
      editingClientCategoryName,
      loadClientCategories,
      writeAuditLog,
    ]
  );

  const handleDeleteClientCategory = useCallback(
    async (category: ClientCategory) => {
      if (!canManageClientCategories) {
        setClientCategoryStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can manage client categories."));
        return;
      }

      const confirmed = window.confirm(
        `Delete the category "${category.name}"? Existing clients that already use this value will keep it, but it will be removed from the standard category list.`
      );

      if (!confirmed) return;

      setClientCategoryStatus(feedbackMessages.loading(`Deleting ${category.name}`));

      const { error } = await supabase
        .from("client_categories")
        .delete()
        .eq("id", category.id);

      if (error) {
        setClientCategoryStatus(feedbackMessages.deleteFailed("client category", error.message));
        return;
      }

      await loadClientCategories();
      await writeAuditLog("Settings", "Client Category Deleted", "client_category", category.id, category.name, {
        summary: `Deleted client category "${category.name}". Existing client records were not changed.`,
      });
      setClientCategoryStatus(`${category.name} deleted from the standard category list.`);
    },
    [canManageClientCategories, loadClientCategories, writeAuditLog]
  );

  const resetClientCategoryState = useCallback(() => {
    setClientCategories([]);
    setClientCategoryDraft("");
    setClientCategoryStatus("");
    setEditingClientCategoryId("");
    setEditingClientCategoryName("");
  }, []);

  return {
    clientCategories,
    clientCategoryOptions,
    clientCategoryDraft,
    setClientCategoryDraft,
    clientCategoryStatus,
    editingClientCategoryId,
    editingClientCategoryName,
    setEditingClientCategoryName,
    loadClientCategories,
    resetClientCategoryState,
    handleAddClientCategory,
    handleStartEditClientCategory,
    handleCancelEditClientCategory,
    handleUpdateClientCategory,
    handleDeleteClientCategory,
  };
}
