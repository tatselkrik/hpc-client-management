import { useMemo } from "react";

import type {
  AnalyticsActivityRecord,
  AnalyticsClient4PsInsight,
  AnalyticsClientRow,
  AnalyticsCssrsInsight,
  AnalyticsDrilldownClient,
  ClientTab,
  Section,
} from "../../appShared";
import {
  FOUR_PS_FACTORS,
  FOUR_PS_ROWS,
  getDateKeyFromDate,
} from "../../appShared";
import {
  parseDateKeyAsLocalDate,
  toLocalDateKey,
} from "../analytics/analyticsDateHelpers";
import type { DashboardActivityItem } from "./DashboardSection";

type ClientAccessLookupItem = {
  id: string;
  hpc_representative?: string | null;
};

type UseDashboardInsightsOptions = {
  analyticsTodayKey: string;
  analyticsClientRows: AnalyticsClientRow[];
  allAnalyticsClientRows: AnalyticsClientRow[];
  analyticsProgressNotes: AnalyticsActivityRecord[];
  analyticsDocuments: AnalyticsActivityRecord[];
  analyticsAssessments: AnalyticsActivityRecord[];
  analyticsCssrsRecords: AnalyticsCssrsInsight[];
  analyticsClient4PsRecords: AnalyticsClient4PsInsight[];
  analyticsCssrsByClientId: Map<string, AnalyticsCssrsInsight>;
  analyticsClient4PsByClientId: Map<string, AnalyticsClient4PsInsight>;
  clients: ClientAccessLookupItem[];
  selectedClientId: string;
  isAnalyticsCssrsRecordComplete: (record?: AnalyticsCssrsInsight) => boolean;
  makeAnalyticsDrilldownClient: (client: AnalyticsClientRow) => AnalyticsDrilldownClient;
  canCurrentProfileAccessClient: (client: { hpc_representative?: string | null }) => boolean;
  setSelectedClientId: (clientId: string) => void;
  setActiveClientTab: (tab: ClientTab) => void;
  setActiveSection: (section: Section) => void;
  setClientMessage: (message: string) => void;
};

export function useDashboardInsights({
  analyticsTodayKey,
  analyticsClientRows,
  allAnalyticsClientRows,
  analyticsProgressNotes,
  analyticsDocuments,
  analyticsAssessments,
  analyticsCssrsRecords,
  analyticsClient4PsRecords,
  analyticsCssrsByClientId,
  analyticsClient4PsByClientId,
  clients,
  selectedClientId,
  isAnalyticsCssrsRecordComplete,
  makeAnalyticsDrilldownClient,
  canCurrentProfileAccessClient,
  setSelectedClientId,
  setActiveClientTab,
  setActiveSection,
  setClientMessage,
}: UseDashboardInsightsOptions) {
  const dashboardTodayDate = parseDateKeyAsLocalDate(analyticsTodayKey) ?? new Date();
  const dashboardWeekStartDate = new Date(dashboardTodayDate);
  dashboardWeekStartDate.setDate(
    dashboardWeekStartDate.getDate() - ((dashboardWeekStartDate.getDay() + 6) % 7)
  );
  const dashboardWeekStartKey = toLocalDateKey(dashboardWeekStartDate);
  
  const isDashboardDateThisWeek = (value: string | null | undefined) => {
    const dateKey = getDateKeyFromDate(value);
    return Boolean(dateKey && dateKey >= dashboardWeekStartKey && dateKey <= analyticsTodayKey);
  };
  
  const dashboardActiveClientCount = analyticsClientRows.filter(
    (client) => client.status === "Active"
  ).length;
  const dashboardNewClientsThisWeekCount = analyticsClientRows.filter((client) =>
    isDashboardDateThisWeek(client.created_at)
  ).length;
  const dashboardNotesThisWeekCount = analyticsProgressNotes.filter((note) =>
    isDashboardDateThisWeek(note.created_at)
  ).length;
  const dashboardFilesThisWeekCount =
    analyticsDocuments.filter((document) => isDashboardDateThisWeek(document.created_at)).length +
    analyticsAssessments.filter((assessment) => isDashboardDateThisWeek(assessment.created_at)).length;
  
  const isDashboardClient4PsComplete = (record: AnalyticsClient4PsInsight) =>
    FOUR_PS_ROWS.every((row) =>
      FOUR_PS_FACTORS.some((factor) => record.form[row.key][factor.key].trim() !== "")
    );
  
  
  const dashboardSuicidalIdeationWithoutCompletedCssrsClients = useMemo(
    () =>
      analyticsClientRows
        .filter((client) => {
          const reasons = Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons
            : [];
  
          return (
            reasons.includes("Suicidal Ideation") &&
            !isAnalyticsCssrsRecordComplete(analyticsCssrsByClientId.get(client.id))
          );
        })
        .map(makeAnalyticsDrilldownClient),
    [
      analyticsClientRows,
      analyticsCssrsByClientId,
      isAnalyticsCssrsRecordComplete,
      makeAnalyticsDrilldownClient,
    ]
  );
  
  
  const dashboardCompleted4PsWithoutNarrativeClients = useMemo(
    () =>
      analyticsClientRows
        .filter((client) => {
          const record = analyticsClient4PsByClientId.get(client.id);
          return (
            Boolean(record) &&
            isDashboardClient4PsComplete(record as AnalyticsClient4PsInsight) &&
            !record?.narrative_report?.trim()
          );
        })
        .map(makeAnalyticsDrilldownClient),
    [analyticsClientRows, analyticsClient4PsByClientId, makeAnalyticsDrilldownClient]
  );
  
  const dashboardClientIdsWithProgressNotes = useMemo(() => {
    const ids = new Set<string>();
  
    analyticsProgressNotes.forEach((note) => {
      if (note.client_id) {
        ids.add(note.client_id);
      }
    });
  
    return ids;
  }, [analyticsProgressNotes]);
  
  const dashboardClientsWithoutProgressNotes = useMemo(
    () =>
      analyticsClientRows
        .filter((client) => !dashboardClientIdsWithProgressNotes.has(client.id))
        .map(makeAnalyticsDrilldownClient),
    [
      analyticsClientRows,
      dashboardClientIdsWithProgressNotes,
      makeAnalyticsDrilldownClient,
    ]
  );
  
  const dashboardAttentionItems = [
    {
      label: "Suicidal ideation without completed C-SSRS",
      value: dashboardSuicidalIdeationWithoutCompletedCssrsClients.length,
      helpText: "",
      clients: dashboardSuicidalIdeationWithoutCompletedCssrsClients,
      emptyLabel: "All suicidal-ideation clients have a completed C-SSRS record.",
      tab: "cssrs" as ClientTab,
    },
    {
      label: "4Ps complete, no Narrative Report",
      value: dashboardCompleted4PsWithoutNarrativeClients.length,
      helpText: "",
      clients: dashboardCompleted4PsWithoutNarrativeClients,
      emptyLabel: "All completed 4Ps records have Narrative Reports.",
      tab: "fourPs" as ClientTab,
    },
    {
      label: "Clients without Progress Notes",
      value: dashboardClientsWithoutProgressNotes.length,
      helpText: "",
      clients: dashboardClientsWithoutProgressNotes,
      emptyLabel: "All clients have at least one progress note.",
      tab: "notes" as ClientTab,
    },
  ];
  
  const dashboardClientNameById = useMemo(
    () =>
      new Map(
        analyticsClientRows.map((client) => [
          client.id,
          client.client_name?.trim() || "Unnamed client",
        ])
      ),
    [analyticsClientRows]
  );
  
  const formatDashboardDateLabel = (value: string | null | undefined) => {
    const dateKey = getDateKeyFromDate(value);
    if (!dateKey) return "Date unavailable";
    if (dateKey === analyticsTodayKey) return "Today";
    return dateKey;
  };
  
  const dashboardRecentActivity = useMemo<DashboardActivityItem[]>(
    () => {
      const getClientName = (clientId: string | null | undefined) =>
        clientId ? dashboardClientNameById.get(clientId) ?? "Unknown client" : "Unknown client";
  
      const activityItems: DashboardActivityItem[] = [
        ...analyticsClientRows.map((client) => ({
          id: `client-${client.id}`,
          type: "Client created",
          clientId: client.id,
          clientName: client.client_name?.trim() || "Unnamed client",
          createdAt: client.created_at,
        })),
        ...analyticsProgressNotes.map((note) => ({
          id: `note-${note.id}`,
          type: "Progress note added",
          clientId: note.client_id,
          clientName: getClientName(note.client_id),
          createdAt: note.created_at,
        })),
        ...analyticsDocuments.map((document) => ({
          id: `document-${document.id}`,
          type: "Document uploaded",
          clientId: document.client_id,
          clientName: getClientName(document.client_id),
          createdAt: document.created_at,
        })),
        ...analyticsAssessments.map((assessment) => ({
          id: `assessment-${assessment.id}`,
          type: "Assessment uploaded",
          clientId: assessment.client_id,
          clientName: getClientName(assessment.client_id),
          createdAt: assessment.created_at,
        })),
        ...analyticsCssrsRecords.map((record) => ({
          id: `cssrs-${record.client_id}`,
          type: "C-SSRS updated",
          clientId: record.client_id,
          clientName: getClientName(record.client_id),
          createdAt: record.updated_at,
        })),
        ...analyticsClient4PsRecords.map((record) => ({
          id: `four-ps-${record.client_id}`,
          type: record.narrative_report?.trim()
            ? "4Ps narrative saved"
            : "4Ps updated",
          clientId: record.client_id,
          clientName: getClientName(record.client_id),
          createdAt: record.updated_at,
        })),
      ];
  
      return activityItems
        .filter((item) => Boolean(getDateKeyFromDate(item.createdAt)))
        .sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();
  
          if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
            return rightTime - leftTime;
          }
  
          return getDateKeyFromDate(right.createdAt).localeCompare(getDateKeyFromDate(left.createdAt));
        })
        .slice(0, 5);
    },
    [
      analyticsAssessments,
      analyticsClientRows,
      analyticsClient4PsRecords,
      analyticsCssrsRecords,
      analyticsDocuments,
      analyticsProgressNotes,
      dashboardClientNameById,
    ]
  );
  
  const openClientFromDashboard = (clientId: string, tab: ClientTab = "overview") => {
    const requestedClient =
      clients.find((client) => client.id === clientId) ??
      allAnalyticsClientRows.find((client) => client.id === clientId);
  
    if (requestedClient && !canCurrentProfileAccessClient(requestedClient)) {
      setClientMessage(
        "This client is not assigned to your HPC Representative profile, so it cannot be opened from Dashboard."
      );
      setActiveClientTab("overview");
      setActiveSection("clients");
      return;
    }
  
    setSelectedClientId(clientId);
    setActiveClientTab(tab);
    setActiveSection("clients");
  };
  
  const openSelectedClientFromDashboard = (tab: ClientTab = "overview") => {
    if (!selectedClientId) return;
    openClientFromDashboard(selectedClientId, tab);
  };

  return {
    dashboardActiveClientCount,
    dashboardNewClientsThisWeekCount,
    dashboardNotesThisWeekCount,
    dashboardFilesThisWeekCount,
    dashboardAttentionItems,
    dashboardRecentActivity,
    openClientFromDashboard,
    openSelectedClientFromDashboard,
    formatDashboardDateLabel,
  };
}