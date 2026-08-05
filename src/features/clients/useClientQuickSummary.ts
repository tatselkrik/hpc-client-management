import { useMemo } from "react";

import type {
  AnalyticsCssrsInsight,
  ClientAssessment,
  ClientDocument,
  ClientForm,
  ProgressNote,
} from "../../appShared";
import { formatCategoryPath } from "../../appShared";
import { formatClientSummaryDate } from "./clientOverviewHelpers";
import type { ClientFilterRow } from "./useClientFilters";

type UseClientQuickSummaryArgs = {
  selectedClient: ClientFilterRow | null;
  clientForm: ClientForm;
  cssrsByClientId: Map<string, AnalyticsCssrsInsight>;
  hasSuicidalIdeation: boolean;
  progressNotes: ProgressNote[];
  documents: ClientDocument[];
  assessments: ClientAssessment[];
};

export function useClientQuickSummary({
  selectedClient,
  clientForm,
  cssrsByClientId,
  hasSuicidalIdeation,
  progressNotes,
  documents,
  assessments,
}: UseClientQuickSummaryArgs) {
  return useMemo(() => {
    if (!selectedClient) return null;

    const cssrsRecord = cssrsByClientId.get(selectedClient.id);
    const lastNote = [...progressNotes].sort((left, right) => {
      const leftTime = new Date(
        left.session_date || left.created_at || ""
      ).getTime();
      const rightTime = new Date(
        right.session_date || right.created_at || ""
      ).getTime();

      return (
        (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0)
      );
    })[0];

    const cssrsStatus = hasSuicidalIdeation
      ? cssrsRecord
        ? cssrsRecord.positive_severity
          ? `Saved, severity ${cssrsRecord.positive_severity}`
          : "Saved"
        : "Pending"
      : "Not flagged";

    return {
      name:
        clientForm.client_name.trim() ||
        selectedClient.client_name ||
        "Unnamed Client",
      status: clientForm.client_status,
      category: formatCategoryPath(clientForm.category_path),
      intakeDate: formatClientSummaryDate(clientForm.intake_date),
      cssrsStatus,
      lastProgressNoteDate: lastNote
        ? formatClientSummaryDate(lastNote.session_date || lastNote.created_at)
        : "No notes yet",
      fileSummary: `${documents.length} document${
        documents.length === 1 ? "" : "s"
      } • ${assessments.length} assessment${
        assessments.length === 1 ? "" : "s"
      }`,
    };
  }, [
    assessments.length,
    clientForm.category_path,
    clientForm.client_name,
    clientForm.client_status,
    clientForm.intake_date,
    cssrsByClientId,
    documents.length,
    hasSuicidalIdeation,
    progressNotes,
    selectedClient,
  ]);
}
