import { useCallback, useState } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { getSupabaseFunctionErrorMessage } from "../../lib/supabaseFunctionErrors";
import type {
  Client4PsForm,
  FourPsFactorKey,
  FourPsRowKey,
} from "../../appShared";
import {
  client4PsFormFromDatabaseRow,
  client4PsFormToDatabasePayload,
  emptyClient4PsForm,
} from "../../appShared";
import {
  CLIENT_4PS_NARRATIVE_PROMPT_VERSION,
  getClient4PsMissingRequiredRowLabels,
  stripNarrativeReportHeading,
} from "./client4PsValidation";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseClient4PsManagementArgs = {
  selectedClientId: string;
  canEditClientClinicalRecords: boolean;
  writeAuditLog: WriteAuditLog;
};

export function useClient4PsManagement({
  selectedClientId,
  canEditClientClinicalRecords,
  writeAuditLog,
}: UseClient4PsManagementArgs) {
  const [client4PsForm, setClient4PsForm] = useState<Client4PsForm>(() =>
    emptyClient4PsForm()
  );
  const [client4PsNarrativeReport, setClient4PsNarrativeReport] = useState("");
  const [client4PsNarrativeGeneratedAt, setClient4PsNarrativeGeneratedAt] =
    useState<string | null>(null);
  const [client4PsNarrativePromptVersion, setClient4PsNarrativePromptVersion] =
    useState<string | null>(null);
  const [client4PsMessage, setClient4PsMessage] = useState("");
  const [isSavingClient4Ps, setIsSavingClient4Ps] = useState(false);
  const [isGeneratingClient4PsNarrative, setIsGeneratingClient4PsNarrative] =
    useState(false);

  const loadClient4Ps = useCallback(
    async (
      clientId: string,
      isCurrentRequest: () => boolean = () => true
    ) => {
      if (!clientId) return;

      setClient4PsMessage(feedbackMessages.loading("Loading 4Ps"));

      const { data, error } = await supabase
        .from("client_4ps")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!isCurrentRequest()) return;

      if (error) {
        setClient4PsForm(emptyClient4PsForm());
        setClient4PsNarrativeReport("");
        setClient4PsNarrativeGeneratedAt(null);
        setClient4PsNarrativePromptVersion(null);
        setClient4PsMessage(feedbackMessages.loadFailed("4Ps case conceptualization", error.message));
        return;
      }

      setClient4PsForm(client4PsFormFromDatabaseRow(data));
      setClient4PsNarrativeReport(
        typeof data?.narrative_report === "string" ? data.narrative_report : ""
      );
      setClient4PsNarrativeGeneratedAt(
        typeof data?.narrative_generated_at === "string"
          ? data.narrative_generated_at
          : null
      );
      setClient4PsNarrativePromptVersion(
        typeof data?.narrative_last_prompt_version === "string"
          ? data.narrative_last_prompt_version
          : null
      );
      setClient4PsMessage("");
    },
    []
  );

  const updateClient4PsField = useCallback(
    (
      rowKey: FourPsRowKey,
      factorKey: FourPsFactorKey,
      value: string
    ) => {
      if (!canEditClientClinicalRecords) return;

      setClient4PsForm((prev) => ({
        ...prev,
        [rowKey]: {
          ...prev[rowKey],
          [factorKey]: value,
        },
      }));
    },
    [canEditClientClinicalRecords]
  );

  const updateClient4PsNarrativeReport = useCallback(
    (value: string) => {
      if (!canEditClientClinicalRecords) return;

      setClient4PsNarrativeReport(value);
    },
    [canEditClientClinicalRecords]
  );

  const generateClient4PsNarrative = useCallback(
    async (_targetLabel: string) => {
      if (!canEditClientClinicalRecords) {
        setClient4PsMessage(feedbackMessages.permissionDenied("Your role can view 4Ps, but cannot add or edit it."));
        return;
      }

      if (!selectedClientId) return;

      const missingRequiredRows = getClient4PsMissingRequiredRowLabels(client4PsForm);

      if (missingRequiredRows.length > 0) {
        setClient4PsMessage(
          `Add at least one 4Ps field for ${missingRequiredRows.join(", ")} before generating a narrative report.`
        );
        return;
      }

      setIsGeneratingClient4PsNarrative(true);
      setClient4PsMessage(
        "Generating narrative report draft. Do not close the app while this is processing..."
      );

      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-4ps-narrative",
          {
            body: {
              client_id: selectedClientId,
              four_ps: client4PsForm,
              prompt_version: CLIENT_4PS_NARRATIVE_PROMPT_VERSION,
            },
          }
        );

        if (error) {
          const message = await getSupabaseFunctionErrorMessage(error);
          setClient4PsMessage(feedbackMessages.error("We could not generate the narrative draft.", message));
          return;
        }

        if (data?.error) {
          setClient4PsMessage(feedbackMessages.error("We could not generate the narrative draft.", String(data.error)));
          return;
        }

        const generatedNarrative =
          typeof data?.narrative_report === "string"
            ? stripNarrativeReportHeading(data.narrative_report)
            : "";

        if (!generatedNarrative) {
          setClient4PsMessage(
            "Narrative generation finished, but no report text was returned."
          );
          return;
        }

        const generatedAt =
          typeof data?.generated_at === "string"
            ? data.generated_at
            : new Date().toISOString();
        const promptVersion =
          typeof data?.prompt_version === "string"
            ? data.prompt_version
            : CLIENT_4PS_NARRATIVE_PROMPT_VERSION;

        setClient4PsNarrativeReport(generatedNarrative);
        setClient4PsNarrativeGeneratedAt(generatedAt);
        setClient4PsNarrativePromptVersion(promptVersion);

        setClient4PsMessage(
          "AI draft generated. Review and edit the narrative report before saving."
        );
      } catch (error) {
        const message = getErrorDetail(error);
        setClient4PsMessage(feedbackMessages.error("We could not generate the narrative draft.", message));
      } finally {
        setIsGeneratingClient4PsNarrative(false);
      }
    },
    [
      canEditClientClinicalRecords,
      client4PsForm,
      selectedClientId,
    ]
  );

  const saveClient4Ps = useCallback(
    async (targetLabel: string) => {
      if (!canEditClientClinicalRecords) {
        setClient4PsMessage(feedbackMessages.permissionDenied("Your role can view 4Ps, but cannot add or edit it."));
        return;
      }

      if (!selectedClientId) return;

      const missingRequiredRows = getClient4PsMissingRequiredRowLabels(client4PsForm);

      if (missingRequiredRows.length > 0) {
        setClient4PsMessage(
          `Add at least one 4Ps field for ${missingRequiredRows.join(", ")} before saving.`
        );
        return;
      }

      setIsSavingClient4Ps(true);
      setClient4PsMessage(feedbackMessages.loading("Saving 4Ps case conceptualization"));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const cleanedNarrativeReport = stripNarrativeReportHeading(client4PsNarrativeReport);

      const { error } = await supabase.from("client_4ps").upsert(
        {
          client_id: selectedClientId,
          ...client4PsFormToDatabasePayload(client4PsForm),
          narrative_report:
            cleanedNarrativeReport === ""
              ? null
              : cleanedNarrativeReport,
          narrative_generated_at:
            cleanedNarrativeReport === ""
              ? null
              : client4PsNarrativeGeneratedAt,
          narrative_generated_by:
            cleanedNarrativeReport === ""
              ? null
              : user?.id ?? null,
          narrative_last_prompt_version:
            cleanedNarrativeReport === ""
              ? null
              : client4PsNarrativePromptVersion,
          updated_by: user?.id ?? null,
        },
        { onConflict: "client_id" }
      );

      if (error) {
        setClient4PsMessage(feedbackMessages.saveFailed("4Ps case conceptualization", error.message));
        setIsSavingClient4Ps(false);
        return;
      }

      await writeAuditLog(
        "Clients",
        "Saved 4Ps",
        "client",
        selectedClientId,
        targetLabel,
        {
          summary: "Updated 4Ps case conceptualization and narrative report.",
        }
      );

      setClient4PsNarrativeReport(cleanedNarrativeReport);
      setClient4PsMessage(feedbackMessages.saved("4Ps case conceptualization"));
      setIsSavingClient4Ps(false);
    },
    [
      canEditClientClinicalRecords,
      client4PsForm,
      client4PsNarrativeGeneratedAt,
      client4PsNarrativePromptVersion,
      client4PsNarrativeReport,
      selectedClientId,
      writeAuditLog,
    ]
  );

  const clearClient4Ps = useCallback(() => {
    setClient4PsForm(emptyClient4PsForm());
    setClient4PsNarrativeReport("");
    setClient4PsNarrativeGeneratedAt(null);
    setClient4PsNarrativePromptVersion(null);
    setClient4PsMessage("");
  }, []);

  return {
    client4PsForm,
    client4PsNarrativeReport,
    client4PsMessage,
    isSavingClient4Ps,
    isGeneratingClient4PsNarrative,
    loadClient4Ps,
    clearClient4Ps,
    updateClient4PsField,
    updateClient4PsNarrativeReport,
    generateClient4PsNarrative,
    saveClient4Ps,
  };
}
