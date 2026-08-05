import { useMemo } from "react";

import type {
  ClientAssessment,
  ClientDocument,
  ClientForm,
} from "../../appShared";
import type { ClientFilterRow } from "./useClientFilters";

type UseSelectedClientViewsArgs = {
  filteredClients: ClientFilterRow[];
  selectedClientId: string;
  filteredDocuments: ClientDocument[];
  selectedDocumentId: string;
  filteredAssessments: ClientAssessment[];
  selectedAssessmentId: string;
  clientForm: ClientForm;
  /**
   * Kept optional for compatibility with App.tsx versions that still pass the
   * normalized client list. This hook no longer computes activeClientCount.
   */
  clientRows?: ClientFilterRow[];
};

export function useSelectedClientViews({
  filteredClients,
  selectedClientId,
  filteredDocuments,
  selectedDocumentId,
  filteredAssessments,
  selectedAssessmentId,
  clientForm,
  clientRows = [],
}: UseSelectedClientViewsArgs) {
  const selectedClient = useMemo(
    () =>
      filteredClients.find((client) => client.id === selectedClientId) ??
      clientRows.find((client) => client.id === selectedClientId) ??
      null,
    [clientRows, filteredClients, selectedClientId]
  );

  const selectedDocument = useMemo(
    () =>
      filteredDocuments.find((document) => document.id === selectedDocumentId) ??
      null,
    [filteredDocuments, selectedDocumentId]
  );

  const selectedAssessment = useMemo(
    () =>
      filteredAssessments.find(
        (assessment) => assessment.id === selectedAssessmentId
      ) ?? null,
    [filteredAssessments, selectedAssessmentId]
  );

  const hasSuicidalIdeation = useMemo(
    () => clientForm.counselling_reasons.includes("Suicidal Ideation"),
    [clientForm.counselling_reasons]
  );


  return {
    selectedClient,
    selectedDocument,
    selectedAssessment,
    hasSuicidalIdeation,
  };
}
