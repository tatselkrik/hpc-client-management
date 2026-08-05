export type FeedbackTone = "neutral" | "info" | "loading" | "success" | "warning" | "error";

const sentenceCase = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Item";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const getErrorDetail = (error: unknown, fallback = "Unknown error") => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
};

const isPermissionPolicyDetail = (detail?: string | null) => {
  const normalized = detail?.trim().toLowerCase() ?? "";

  return (
    normalized.includes("row-level security policy") ||
    normalized.includes("violates row-level security") ||
    normalized.includes("permission denied")
  );
};

const permissionPolicyMessage =
  "Your account does not have permission to make this change.";

export const appendFeedbackDetail = (message: string, detail?: string | null) => {
  const normalizedDetail = detail?.trim();

  if (!normalizedDetail) {
    return message;
  }

  if (isPermissionPolicyDetail(normalizedDetail)) {
    return `${message} ${permissionPolicyMessage}`;
  }

  return `${message} ${normalizedDetail}`;
};

export const classifyFeedbackMessage = (message: string): FeedbackTone => {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return "neutral";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("could not") ||
    normalized.includes("unable") ||
    normalized.includes("error") ||
    normalized.includes("invalid")
  ) {
    return "error";
  }

  if (
    normalized.includes("unsaved") ||
    normalized.includes("required") ||
    normalized.includes("cannot") ||
    normalized.includes("locked") ||
    normalized.includes("only ") ||
    normalized.includes("not available")
  ) {
    return "warning";
  }

  if (
    normalized.includes("saving") ||
    normalized.includes("loading") ||
    normalized.includes("preparing") ||
    normalized.includes("uploading") ||
    normalized.includes("downloading") ||
    normalized.includes("deleting") ||
    normalized.includes("renaming") ||
    normalized.includes("creating") ||
    normalized.includes("updating") ||
    normalized.includes("publishing") ||
    normalized.includes("disabling") ||
    normalized.includes("reviewing") ||
    normalized.includes("checking") ||
    normalized.includes("confirming") ||
    normalized.includes("requesting") ||
    normalized.includes("verifying") ||
    normalized.includes("generating") ||
    normalized.includes("optimizing") ||
    normalized.includes("removing") ||
    normalized.includes("signing")
  ) {
    return "loading";
  }

  if (
    normalized.includes("saved") ||
    normalized.includes("success") ||
    normalized.includes("successful") ||
    normalized.includes("created") ||
    normalized.includes("updated") ||
    normalized.includes("uploaded") ||
    normalized.includes("downloaded") ||
    normalized.includes("deleted") ||
    normalized.includes("renamed") ||
    normalized.includes("published") ||
    normalized.includes("disabled") ||
    normalized.includes("removed") ||
    normalized.includes("enabled") ||
    normalized.includes("added") ||
    normalized.includes("reviewed")
  ) {
    return "success";
  }

  if (normalized.includes("cancelled") || normalized.includes("canceled")) {
    return "info";
  }

  return "neutral";
};

export const feedbackMessages = {
  loading: (action: string) => `${action.trim()}…`,
  info: (message: string) => message,
  warning: (message: string) => message,
  success: (message: string) => message,
  error: (message: string, detail?: string | null) => appendFeedbackDetail(message, detail),

  created: (item: string) => `${sentenceCase(item)} created.`,
  createFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not create the ${item}.`, detail),

  saved: (item: string) => `${sentenceCase(item)} saved.`,
  saveFailed: (item: string, detail?: string | null) => {
    if (
      item.trim().toLowerCase() === "client overview" &&
      isPermissionPolicyDetail(detail)
    ) {
      return (
        "Client overview was not saved. You can edit this client, but you cannot " +
        "change the assigned HPC Representative."
      );
    }

    return appendFeedbackDetail(`We could not save the ${item}.`, detail);
  },

  updated: (item: string) => `${sentenceCase(item)} updated.`,
  updateFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not update the ${item}.`, detail),

  loaded: (item: string) => `${sentenceCase(item)} loaded.`,
  loadFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not load the ${item}.`, detail),

  added: (item: string) => `${sentenceCase(item)} added.`,
  addFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not add the ${item}.`, detail),

  deleted: (item: string) => `${sentenceCase(item)} deleted.`,
  deleteFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not delete the ${item}.`, detail),

  uploaded: (item: string) => `${sentenceCase(item)} uploaded.`,
  uploadFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not upload the ${item}.`, detail),

  renamed: (item: string) => `${sentenceCase(item)} renamed.`,
  renameFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not rename the ${item}.`, detail),

  downloaded: (item: string, location?: string | null) => {
    const normalizedLocation = location?.trim();
    return normalizedLocation
      ? `${sentenceCase(item)} saved to ${normalizedLocation}.`
      : `${sentenceCase(item)} saved to your selected location.`;
  },
  downloadFailed: (item: string, detail?: string | null) =>
    appendFeedbackDetail(`We could not download the ${item}.`, detail),

  cancelled: (item: string) => `${sentenceCase(item)} cancelled.`,

  required: (field: string) => `${sentenceCase(field)} is required.`,
  requiredFields: (fields: string[]) =>
    `Please complete the required fields before saving: ${fields.join(", ")}.`,

  permissionDenied: (message: string) => message,

  unsavedChanges:
    "You have unsaved changes. Save your changes before leaving, or leave without saving to discard them.",
  leaveWithoutSavingTitle: "Leave without saving?",
  leaveWithoutSavingBody: (area: string) => `Your changes to ${area} will be lost.`,
};
