import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { fetchSupabasePages } from "../../lib/supabasePagination";
import type {
  AnalyticsActivityRecord,
  AnalyticsCategoryFilter,
  AnalyticsClient4PsInsight,
  AnalyticsClientInsight,
  AnalyticsCssrsInsight,
  AnalyticsCssrsRiskFilter,
  AnalyticsDateBasis,
  AnalyticsDateRange,
  AnalyticsStatusFilter,
  CssrsBehaviorValue,
  Section,
} from "../../appShared";
import {
  client4PsFormFromDatabaseRow,
  normalizeCssrsBehavior,
  normalizeCssrsDemeanorSelections,
  normalizeCssrsIdeationAnswers,
  normalizeCssrsProtectiveFactorTexts,
} from "../../appShared";

type UseAnalyticsDataLoaderOptions = {
  activeSection: Section;
  userEmail: string | null;
  clientsLength: number;
  progressNotesLength: number;
  documentsLength: number;
  assessmentsLength: number;
};

export function useAnalyticsDataLoader({
  activeSection,
  userEmail,
  clientsLength,
  progressNotesLength,
  documentsLength,
  assessmentsLength,
}: UseAnalyticsDataLoaderOptions) {
  const [analyticsClients, setAnalyticsClients] =
    useState<AnalyticsClientInsight[]>([]);
  const [analyticsProgressNotes, setAnalyticsProgressNotes] =
    useState<AnalyticsActivityRecord[]>([]);
  const [analyticsDocuments, setAnalyticsDocuments] =
    useState<AnalyticsActivityRecord[]>([]);
  const [analyticsAssessments, setAnalyticsAssessments] =
    useState<AnalyticsActivityRecord[]>([]);
  const [analyticsCssrsRecords, setAnalyticsCssrsRecords] =
    useState<AnalyticsCssrsInsight[]>([]);
  const [analyticsClient4PsRecords, setAnalyticsClient4PsRecords] =
    useState<AnalyticsClient4PsInsight[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMessage, setAnalyticsMessage] = useState("");
  const [analyticsExportStatus, setAnalyticsExportStatus] = useState("");
  const [isAnalyticsExporting, setIsAnalyticsExporting] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] =
    useState<AnalyticsDateRange>("ALL");
  const [analyticsDateBasis, setAnalyticsDateBasis] =
    useState<AnalyticsDateBasis>("intake");
  const [analyticsCustomStartDate, setAnalyticsCustomStartDate] = useState("");
  const [analyticsCustomEndDate, setAnalyticsCustomEndDate] = useState("");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] =
    useState<AnalyticsStatusFilter>("all");
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] =
    useState<AnalyticsCategoryFilter>("all");
  const [analyticsCounsellingReasonFilter, setAnalyticsCounsellingReasonFilter] =
    useState("all");
  const [analyticsCssrsRiskFilter, setAnalyticsCssrsRiskFilter] =
    useState<AnalyticsCssrsRiskFilter>("all");

  const analyticsLoadRequestRef = useRef(0);

  const loadAnalyticsData = useCallback(async () => {
    const requestId = ++analyticsLoadRequestRef.current;
    const isCurrentAnalyticsRequest = () => analyticsLoadRequestRef.current === requestId;

    setAnalyticsLoading(true);
    setAnalyticsMessage(feedbackMessages.loading("Loading analytics"));

    const [
      clientsResponse,
      notesResponse,
      documentsResponse,
      assessmentsResponse,
      cssrsResponse,
      client4PsResponse,
    ] = await Promise.all([
      fetchSupabasePages(() =>
        supabase
          .from("clients")
          .select("id, client_name, age, sex, intake_source, sibling_order, sexual_orientation, marital_status, educational_attainment, employment_status, occupation, partner_age, partner_sexual_orientation, years_together, partner_educational_attainment, partner_employment_status, pre_existing_psychiatric_diagnosis, pre_existing_psychiatric_diagnosis_details, hpc_representative, intake_date, client_status, category_path, created_at, updated_at, counselling_reasons")
          .order("updated_at", { ascending: false })
      ),
      fetchSupabasePages(() =>
        supabase
          .from("progress_notes")
          .select("id, client_id, created_at")
          .order("created_at", { ascending: false })
      ),
      fetchSupabasePages(() =>
        supabase
          .from("client_documents")
          .select("id, client_id, created_at")
          .order("created_at", { ascending: false })
      ),
      fetchSupabasePages(() =>
        supabase
          .from("client_assessments")
          .select("id, client_id, created_at")
          .order("created_at", { ascending: false })
      ),
      fetchSupabasePages(() =>
        supabase
          .from("client_cssrs")
          .select("client_id, positive_severity, behavior, ideation_answers, demeanor_selections, protective_factor_texts, updated_at")
          .order("updated_at", { ascending: false })
      ),
      fetchSupabasePages(() =>
        supabase
          .from("client_4ps")
          .select("*")
          .order("updated_at", { ascending: false })
      ),
    ]);

    if (!isCurrentAnalyticsRequest()) return;

    const analyticsError =
      clientsResponse.error ??
      notesResponse.error ??
      documentsResponse.error ??
      assessmentsResponse.error ??
      cssrsResponse.error ??
      client4PsResponse.error;

    if (analyticsError) {
      setAnalyticsMessage(feedbackMessages.loadFailed("analytics", analyticsError.message));
      setAnalyticsLoading(false);
      return;
    }

    setAnalyticsClients(
      (clientsResponse.data ?? []).map((client) => ({
        id: client.id,
        client_name: client.client_name ?? null,
        age: typeof client.age === "number" ? client.age : null,
        sex: typeof client.sex === "string" ? client.sex : null,
        intake_source:
          typeof client.intake_source === "string" ? client.intake_source : null,
        sibling_order:
          typeof client.sibling_order === "string" ? client.sibling_order : null,
        sexual_orientation:
          typeof client.sexual_orientation === "string"
            ? client.sexual_orientation
            : null,
        marital_status:
          typeof client.marital_status === "string" ? client.marital_status : null,
        educational_attainment:
          typeof client.educational_attainment === "string"
            ? client.educational_attainment
            : null,
        employment_status:
          typeof client.employment_status === "string"
            ? client.employment_status
            : null,
        occupation:
          typeof client.occupation === "string" ? client.occupation : null,
        partner_age:
          typeof client.partner_age === "number" ? client.partner_age : null,
        partner_sexual_orientation:
          typeof client.partner_sexual_orientation === "string"
            ? client.partner_sexual_orientation
            : null,
        years_together:
          typeof client.years_together === "number" ? client.years_together : null,
        partner_educational_attainment:
          typeof client.partner_educational_attainment === "string"
            ? client.partner_educational_attainment
            : null,
        partner_employment_status:
          typeof client.partner_employment_status === "string"
            ? client.partner_employment_status
            : null,
        pre_existing_psychiatric_diagnosis:
          typeof client.pre_existing_psychiatric_diagnosis === "string"
            ? client.pre_existing_psychiatric_diagnosis
            : null,
        pre_existing_psychiatric_diagnosis_details:
          typeof client.pre_existing_psychiatric_diagnosis_details === "string"
            ? client.pre_existing_psychiatric_diagnosis_details
            : null,
        hpc_representative:
          typeof client.hpc_representative === "string"
            ? client.hpc_representative
            : null,
        intake_date: client.intake_date ?? null,
        client_status: client.client_status === "Terminated" ? "Terminated" : "Active",
        category_path:
          typeof client.category_path === "string" ? client.category_path : null,
        created_at: client.created_at ?? new Date().toISOString(),
        updated_at:
          client.updated_at ?? client.created_at ?? new Date().toISOString(),
        counselling_reasons: Array.isArray(client.counselling_reasons)
          ? client.counselling_reasons
          : [],
      }))
    );

    setAnalyticsProgressNotes(
      (notesResponse.data ?? []).map((note) => ({
        id: note.id,
        client_id: note.client_id ?? null,
        created_at: note.created_at ?? new Date().toISOString(),
      }))
    );

    setAnalyticsDocuments(
      (documentsResponse.data ?? []).map((document) => ({
        id: document.id,
        client_id: document.client_id ?? null,
        created_at: document.created_at ?? new Date().toISOString(),
      }))
    );

    setAnalyticsAssessments(
      (assessmentsResponse.data ?? []).map((assessment) => ({
        id: assessment.id,
        client_id: assessment.client_id ?? null,
        created_at: assessment.created_at ?? new Date().toISOString(),
      }))
    );

    setAnalyticsCssrsRecords(
      (cssrsResponse.data ?? []).map((record) => ({
        client_id: record.client_id,
        positive_severity:
          typeof record.positive_severity === "number" ? record.positive_severity : null,
        behavior: normalizeCssrsBehavior(
          record.behavior as Partial<Record<keyof CssrsBehaviorValue, unknown>> | null | undefined
        ),
        ideation_answers: normalizeCssrsIdeationAnswers(
          record.ideation_answers as Record<string, unknown> | null | undefined
        ),
        demeanor_selections: normalizeCssrsDemeanorSelections(
          record.demeanor_selections as Record<string, unknown> | null | undefined
        ),
        protective_factor_texts: normalizeCssrsProtectiveFactorTexts(
          record.protective_factor_texts as Record<string, unknown> | null | undefined
        ),
        updated_at: record.updated_at ?? new Date().toISOString(),
      }))
    );

    setAnalyticsClient4PsRecords(
      (client4PsResponse.data ?? []).map((record) => ({
        client_id: String(record.client_id),
        form: client4PsFormFromDatabaseRow(record),
        narrative_report:
          typeof record.narrative_report === "string" ? record.narrative_report : null,
        created_at: record.created_at ?? new Date().toISOString(),
        updated_at:
          record.updated_at ?? record.created_at ?? new Date().toISOString(),
      }))
    );

    setAnalyticsMessage("");
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    if (!userEmail || (activeSection !== "analytics" && activeSection !== "dashboard")) {
      return;
    }

    void loadAnalyticsData();
  }, [
    activeSection,
    userEmail,
    clientsLength,
    progressNotesLength,
    documentsLength,
    assessmentsLength,
    loadAnalyticsData,
  ]);

  return {
    analyticsClients,
    analyticsProgressNotes,
    analyticsDocuments,
    analyticsAssessments,
    analyticsCssrsRecords,
    analyticsClient4PsRecords,
    analyticsLoading,
    analyticsMessage,
    analyticsExportStatus,
    isAnalyticsExporting,
    analyticsDateRange,
    analyticsDateBasis,
    analyticsCustomStartDate,
    analyticsCustomEndDate,
    analyticsStatusFilter,
    analyticsCategoryFilter,
    analyticsCounsellingReasonFilter,
    analyticsCssrsRiskFilter,
    setAnalyticsExportStatus,
    setIsAnalyticsExporting,
    setAnalyticsDateRange,
    setAnalyticsDateBasis,
    setAnalyticsCustomStartDate,
    setAnalyticsCustomEndDate,
    setAnalyticsStatusFilter,
    setAnalyticsCategoryFilter,
    setAnalyticsCounsellingReasonFilter,
    setAnalyticsCssrsRiskFilter,
    loadAnalyticsData,
  };
}
