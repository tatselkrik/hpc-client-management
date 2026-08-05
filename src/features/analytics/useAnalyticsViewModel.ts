import { useCallback, useMemo } from "react";

import type {
  AnalyticsActivityRecord,
  AnalyticsCategoryFilter,
  AnalyticsClient4PsInsight,
  AnalyticsClientDrilldownGroup,
  AnalyticsClientInsight,
  AnalyticsClientRow,
  AnalyticsCssrsInsight,
  AnalyticsCssrsRiskFilter,
  AnalyticsDateBasis,
  AnalyticsDateRange,
  AnalyticsDrilldownClient,
  AnalyticsFilterOption,
  AnalyticsDataQualityItem,
  AnalyticsOperationalMetric,
  AnalyticsStatusFilter,
  IntakeMonthRange,
  IntakeTimelineGrouping,
  IntakeYearRange,
  Section,
} from "../../appShared";
import {
  CSSRS_IDEATION_ITEMS,
  FOUR_PS_ROWS,
  formatCategoryPath,
  hasCompleteCssrsProtectiveFactorTexts,
  formatMonthKeyLabel,
  getDateKeyFromDate,
  getMonthKeyFromDate,
  getYearLabelFromDate,
  mergeClientCategoryOptions,
  normalizeClientMetadata,
} from "../../appShared";
import {
  addDaysToDateKey,
  getInclusiveDaySpan,
} from "./analyticsDateHelpers";
import {
  buildActivityDeltaMeta,
  buildRecordActivityTrendSeries,
  buildSingleActivitySeries,
} from "./analyticsRecordActivity";
import { useAnalyticsDataLoader } from "./useAnalyticsDataLoader";
import {
  getClient4PsFilledFieldCount,
  getClient4PsRowFilledFieldCount,
} from "../clients/client4PsValidation";

export type AnalyticsDistributionItem = {
  label: string;
  value: number;
};

export type AnalyticsIntakeSeriesItem = {
  key: string;
  label: string;
  value: number;
};

export type AnalyticsRecordActivityTrendItem = {
  key: string;
  label: string;
  progressNotes: number;
  documents: number;
  assessments: number;
};

export type AnalyticsActivityDeltaMeta = {
  direction: string;
  message: string;
};

export type AnalyticsSummaryComparisons = {
  label: string;
  filteredClients: string;
  cssrsCompletion: string;
  pendingCssrs: string;
  elevatedCssrs: string;
  fourPsComplete: string;
};

type AnalyticsDateBounds = {
  start: string;
  end: string;
};

type AnalyticsAccessClient = {
  hpc_representative?: string | null;
};

type AnalyticsStateSetter<T> = (value: T) => void;

export type AnalyticsViewModel = {
  analyticsClientRows: AnalyticsClientRow[];
  analyticsAllClientCount: number;
  analyticsProgressNotes: AnalyticsActivityRecord[];
  analyticsDocuments: AnalyticsActivityRecord[];
  analyticsAssessments: AnalyticsActivityRecord[];
  analyticsCssrsRecords: AnalyticsCssrsInsight[];
  analyticsClient4PsRecords: AnalyticsClient4PsInsight[];
  analyticsDateRange: AnalyticsDateRange;
  setAnalyticsDateRange: AnalyticsStateSetter<AnalyticsDateRange>;
  analyticsDateBasis: AnalyticsDateBasis;
  setAnalyticsDateBasis: AnalyticsStateSetter<AnalyticsDateBasis>;
  analyticsCustomStartDate: string;
  setAnalyticsCustomStartDate: AnalyticsStateSetter<string>;
  analyticsCustomEndDate: string;
  setAnalyticsCustomEndDate: AnalyticsStateSetter<string>;
  analyticsStatusFilter: AnalyticsStatusFilter;
  setAnalyticsStatusFilter: AnalyticsStateSetter<AnalyticsStatusFilter>;
  analyticsCategoryFilter: AnalyticsCategoryFilter;
  setAnalyticsCategoryFilter: AnalyticsStateSetter<AnalyticsCategoryFilter>;
  analyticsCounsellingReasonFilter: string;
  setAnalyticsCounsellingReasonFilter: AnalyticsStateSetter<string>;
  analyticsCssrsRiskFilter: AnalyticsCssrsRiskFilter;
  setAnalyticsCssrsRiskFilter: AnalyticsStateSetter<AnalyticsCssrsRiskFilter>;
  analyticsCounsellingReasonOptions: AnalyticsFilterOption[];
  analyticsCategoryOptions: AnalyticsFilterOption[];
  analyticsFilterSummary: string;
  analyticsDefaultRepresentativeFilter: string;
  canUseAllRepresentativeAnalytics: boolean;
  canUseIndividualRepresentativeAnalytics: boolean;
  analyticsSummaryComparisons: AnalyticsSummaryComparisons;
  analyticsDrilldownGroups: {
    allClients: AnalyticsClientDrilldownGroup;
    completedCssrs: AnalyticsClientDrilldownGroup;
    pendingCssrs: AnalyticsClientDrilldownGroup;
    elevatedCssrs: AnalyticsClientDrilldownGroup;
    recentBehavior: AnalyticsClientDrilldownGroup;
  };
  analyticsDataQualityItems: AnalyticsDataQualityItem[];
  analyticsOperationalMetrics: AnalyticsOperationalMetric[];
  analyticsLoading: boolean;
  analyticsMessage: string;
  analyticsExportStatus: string;
  isAnalyticsExporting: boolean;
  setAnalyticsExportStatus: AnalyticsStateSetter<string>;
  setIsAnalyticsExporting: AnalyticsStateSetter<boolean>;
  intakeTimelineGrouping: IntakeTimelineGrouping;
  setIntakeTimelineGrouping: AnalyticsStateSetter<IntakeTimelineGrouping>;
  intakeMonthRange: IntakeMonthRange;
  setIntakeMonthRange: AnalyticsStateSetter<IntakeMonthRange>;
  intakeYearRange: IntakeYearRange;
  setIntakeYearRange: AnalyticsStateSetter<IntakeYearRange>;
  visibleIntakeSeries: AnalyticsIntakeSeriesItem[];
  statusDistribution: AnalyticsDistributionItem[];
  categoryDistribution: AnalyticsDistributionItem[];
  counsellingReasonDistribution: AnalyticsDistributionItem[];
  clientsWithSuicidalIdeation: AnalyticsClientRow[];
  cssrsSeverityDistribution: AnalyticsDistributionItem[];
  cssrsBehaviorDistribution: AnalyticsDistributionItem[];
  fourPsCoverageDistribution: AnalyticsDistributionItem[];
  latestClientPoint: AnalyticsIntakeSeriesItem | null;
  topCounsellingReason: AnalyticsDistributionItem | null;
  cssrsCompletedCount: number;
  cssrsCompletedForIdeationCount: number;
  cssrsPendingForIdeationCount: number;
  elevatedCssrsCount: number;
  totalProgressNoteCount: number;
  totalDocumentCount: number;
  totalAssessmentCount: number;
  total4PsStartedCount: number;
  total4PsCompleteCount: number;
  total4PsNarrativeCount: number;
  progressNotesActivityDelta: AnalyticsActivityDeltaMeta;
  documentActivityDelta: AnalyticsActivityDeltaMeta;
  assessmentActivityDelta: AnalyticsActivityDeltaMeta;
  recordActivityTrendSeries: AnalyticsRecordActivityTrendItem[];
  recordActivityPeriodsLabel: string;
};

export type AnalyticsDashboardInputs = {
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
  isAnalyticsCssrsRecordComplete: (record?: AnalyticsCssrsInsight) => boolean;
  makeAnalyticsDrilldownClient: (client: AnalyticsClientRow) => AnalyticsDrilldownClient;
};

type UseAnalyticsViewModelOptions = {
  activeSection: Section;
  userEmail: string | null;
  clientsLength: number;
  progressNotesLength: number;
  documentsLength: number;
  assessmentsLength: number;
  canCurrentProfileUseClientInPrimaryAnalytics: (client: AnalyticsAccessClient) => boolean;
  shouldUseAllRepresentativeAnalyticsDataset: boolean;
  shouldDefaultAnalyticsRepresentativeToAssigned: boolean;
  assignedHpcRepresentativeName: string;
  canUseAllRepresentativeAnalyticsForProfile: boolean;
  canUseIndividualRepresentativeAnalyticsForProfile: boolean;
  clientCategoryOptions: string[];
  intakeTimelineGrouping: IntakeTimelineGrouping;
  setIntakeTimelineGrouping: AnalyticsStateSetter<IntakeTimelineGrouping>;
  intakeMonthRange: IntakeMonthRange;
  setIntakeMonthRange: AnalyticsStateSetter<IntakeMonthRange>;
  intakeYearRange: IntakeYearRange;
  setIntakeYearRange: AnalyticsStateSetter<IntakeYearRange>;
};

export type UseAnalyticsViewModelResult = {
  analyticsClients: AnalyticsClientInsight[];
  analyticsDashboardInputs: AnalyticsDashboardInputs;
  analyticsViewModel: AnalyticsViewModel;
  loadAnalyticsData: () => Promise<void>;
};

export function useAnalyticsViewModel({
  activeSection,
  userEmail,
  clientsLength,
  progressNotesLength,
  documentsLength,
  assessmentsLength,
  canCurrentProfileUseClientInPrimaryAnalytics,
  shouldUseAllRepresentativeAnalyticsDataset,
  shouldDefaultAnalyticsRepresentativeToAssigned,
  assignedHpcRepresentativeName,
  canUseAllRepresentativeAnalyticsForProfile,
  canUseIndividualRepresentativeAnalyticsForProfile,
  clientCategoryOptions,
  intakeTimelineGrouping,
  setIntakeTimelineGrouping,
  intakeMonthRange,
  setIntakeMonthRange,
  intakeYearRange,
  setIntakeYearRange,
}: UseAnalyticsViewModelOptions): UseAnalyticsViewModelResult {
  const {
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
  } = useAnalyticsDataLoader({
    activeSection,
    userEmail,
    clientsLength,
    progressNotesLength,
    documentsLength,
    assessmentsLength,
  });

  const allAnalyticsClientRows = useMemo<AnalyticsClientRow[]>(
    () =>
      analyticsClients.map((client) => {
        const metadata = normalizeClientMetadata(client);

        return {
          id: client.id,
          client_name: client.client_name,
          created_at: client.created_at,
          updated_at: client.updated_at,
          intake_date: client.intake_date,
          client_status: client.client_status,
          status: metadata.status,
          category_path: metadata.category_path,
          intake_month: metadata.intake_month,
          intake_year: metadata.intake_year,
          age: client.age ?? null,
          sex: client.sex ?? null,
          intake_source: client.intake_source ?? null,
          sibling_order: client.sibling_order ?? null,
          sexual_orientation: client.sexual_orientation ?? null,
          marital_status: client.marital_status ?? null,
          educational_attainment: client.educational_attainment ?? null,
          employment_status: client.employment_status ?? null,
          occupation: client.occupation ?? null,
          partner_age: client.partner_age ?? null,
          partner_sexual_orientation: client.partner_sexual_orientation ?? null,
          years_together: client.years_together ?? null,
          partner_educational_attainment: client.partner_educational_attainment ?? null,
          partner_employment_status: client.partner_employment_status ?? null,
          pre_existing_psychiatric_diagnosis:
            client.pre_existing_psychiatric_diagnosis ?? null,
          pre_existing_psychiatric_diagnosis_details:
            client.pre_existing_psychiatric_diagnosis_details ?? null,
          hpc_representative: client.hpc_representative ?? null,
          counselling_reasons: Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons
            : [],
        };
      }),
    [analyticsClients]
  );

  const analyticsClientRows = useMemo<AnalyticsClientRow[]>(
    () => allAnalyticsClientRows.filter(canCurrentProfileUseClientInPrimaryAnalytics),
    [allAnalyticsClientRows, canCurrentProfileUseClientInPrimaryAnalytics]
  );

  const analyticsCssrsByClientId = useMemo(
    () => new Map(analyticsCssrsRecords.map((record) => [record.client_id, record])),
    [analyticsCssrsRecords]
  );

  const analyticsClient4PsByClientId = useMemo(
    () =>
      new Map(
        analyticsClient4PsRecords.map((record) => [
          record.client_id,
          record,
        ])
      ),
    [analyticsClient4PsRecords]
  );

  const analyticsCounsellingReasonOptions = useMemo<AnalyticsFilterOption[]>(
    () => [
      { value: "all", label: "All reasons" },
      ...Array.from(
        analyticsClientRows.reduce((set, client) => {
          const reasons = Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons
            : [];

          reasons.forEach((reason: string) => {
            const trimmed = reason.trim();
            if (trimmed) set.add(trimmed);
          });

          return set;
        }, new Set<string>())
      )
        .sort((left, right) => left.localeCompare(right))
        .map((reason) => ({ value: reason, label: reason })),
    ],
    [analyticsClientRows]
  );

  const getAnalyticsRelativeDateKey = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return getDateKeyFromDate(date.toISOString());
  };

  const analyticsTodayKey = getDateKeyFromDate(new Date().toISOString());
  const analyticsLast30DaysStartKey = getAnalyticsRelativeDateKey(29);
  const analyticsLast60DaysStartKey = getAnalyticsRelativeDateKey(59);
  const analyticsLast90DaysStartKey = getAnalyticsRelativeDateKey(89);

  const analyticsDateRangeBounds = useMemo(() => {
    if (analyticsDateRange === "LAST_30_DAYS") {
      return { start: analyticsLast30DaysStartKey, end: analyticsTodayKey };
    }

    if (analyticsDateRange === "LAST_90_DAYS") {
      return { start: analyticsLast90DaysStartKey, end: analyticsTodayKey };
    }

    if (analyticsDateRange === "THIS_YEAR") {
      return { start: `${analyticsTodayKey.slice(0, 4)}-01-01`, end: analyticsTodayKey };
    }

    if (analyticsDateRange === "CUSTOM") {
      const start = analyticsCustomStartDate.trim();
      const end = analyticsCustomEndDate.trim();

      if (start && end && start > end) {
        return { start: end, end: start };
      }

      return { start, end };
    }

    return { start: "", end: "" };
  }, [
    analyticsCustomEndDate,
    analyticsCustomStartDate,
    analyticsDateRange,
    analyticsLast30DaysStartKey,
    analyticsLast90DaysStartKey,
    analyticsTodayKey,
  ]);

  const isAnalyticsCssrsRecordComplete = useCallback((record?: AnalyticsCssrsInsight) => {
    if (!record) return false;

    const levelOneItem = CSSRS_IDEATION_ITEMS.find((item) => item.number === 1);
    const levelOneAnswer = levelOneItem
      ? record.ideation_answers[levelOneItem.id]
      : null;
    const hasLevelOneAnswer = levelOneAnswer === "yes" || levelOneAnswer === "no";
    const hasMentalStatusSelection = Object.values(record.demeanor_selections).some(Boolean);
    const hasCompleteProtectiveFactors = hasCompleteCssrsProtectiveFactorTexts(
      record.protective_factor_texts
    );

    return hasLevelOneAnswer && hasMentalStatusSelection && hasCompleteProtectiveFactors;
  }, []);

  const getAnalyticsClientRiskState = useCallback((client: AnalyticsClientRow) => {
    const reasons = Array.isArray(client.counselling_reasons)
      ? client.counselling_reasons
      : [];
    const hasIdeation = reasons.includes("Suicidal Ideation");
    const cssrs = analyticsCssrsByClientId.get(client.id);
    const hasCompletedCssrs = isAnalyticsCssrsRecordComplete(cssrs);
    const severity = cssrs?.positive_severity ?? null;
    const hasRecentBehavior = cssrs?.behavior.recent === "yes";
    const isSeverityFourOrFive = (severity ?? 0) >= 4;
    const isElevated = isSeverityFourOrFive;
    const isPending = hasIdeation && !hasCompletedCssrs;

    return {
      hasIdeation,
      hasCompletedCssrs,
      hasRecentBehavior,
      isSeverityFourOrFive,
      isElevated,
      isPending,
      label: isPending
        ? "C-SSRS pending"
        : isElevated
          ? "Elevated C-SSRS"
          : hasCompletedCssrs
            ? `C-SSRS severity ${severity ?? "not set"}`
            : hasIdeation
              ? "Suicidal ideation flagged"
              : "No C-SSRS flag",
    };
  }, [analyticsCssrsByClientId, isAnalyticsCssrsRecordComplete]);

  const makeAnalyticsDrilldownClient = useCallback((client: AnalyticsClientRow): AnalyticsDrilldownClient => {
    const reasons = Array.isArray(client.counselling_reasons)
      ? client.counselling_reasons
      : [];

    return {
      id: client.id,
      client_name: client.client_name ?? null,
      status: client.status,
      category_path: formatCategoryPath(client.category_path ?? ""),
      intake_date: client.intake_date ?? null,
      counselling_reasons: reasons,
      cssrs_risk_label: getAnalyticsClientRiskState(client).label,
    };
  }, [getAnalyticsClientRiskState]);

  const previousAnalyticsDateRangeBounds = useMemo<AnalyticsDateBounds>(() => {
    if (analyticsDateRange === "ALL") {
      return { start: "", end: "" };
    }

    if (!analyticsDateRangeBounds.start || !analyticsDateRangeBounds.end) {
      return { start: "", end: "" };
    }

    if (analyticsDateRange === "THIS_YEAR") {
      const currentYear = Number(analyticsDateRangeBounds.start.slice(0, 4));
      if (!Number.isFinite(currentYear)) {
        return { start: "", end: "" };
      }

      const previousYear = currentYear - 1;
      return {
        start: `${previousYear}-01-01`,
        end: `${previousYear}${analyticsDateRangeBounds.end.slice(4)}`,
      };
    }

    const spanDays = getInclusiveDaySpan(
      analyticsDateRangeBounds.start,
      analyticsDateRangeBounds.end
    );
    const previousEnd = addDaysToDateKey(analyticsDateRangeBounds.start, -1);

    return {
      start: addDaysToDateKey(previousEnd, -(spanDays - 1)),
      end: previousEnd,
    };
  }, [analyticsDateRange, analyticsDateRangeBounds]);

  const analyticsComparisonPeriodLabel =
    previousAnalyticsDateRangeBounds.start && previousAnalyticsDateRangeBounds.end
      ? `${previousAnalyticsDateRangeBounds.start} to ${previousAnalyticsDateRangeBounds.end}`
      : analyticsDateRange === "ALL"
        ? "No previous-period comparison for all dates"
        : "Set a complete date range to compare";

  const doesAnalyticsClientMatchFilters = useCallback((
    client: AnalyticsClientRow,
    dateRangeBounds: AnalyticsDateBounds
  ) => {
    const dateSource =
      analyticsDateBasis === "intake"
        ? client.intake_date || client.created_at
        : client.created_at;
    const dateKey = getDateKeyFromDate(dateSource);

    if (dateRangeBounds.start && (!dateKey || dateKey < dateRangeBounds.start)) {
      return false;
    }

    if (dateRangeBounds.end && (!dateKey || dateKey > dateRangeBounds.end)) {
      return false;
    }

    if (analyticsStatusFilter !== "all" && client.status !== analyticsStatusFilter) {
      return false;
    }

    if (
      analyticsCategoryFilter !== "all" &&
      formatCategoryPath(client.category_path ?? "") !== analyticsCategoryFilter
    ) {
      return false;
    }

    const reasons = Array.isArray(client.counselling_reasons)
      ? client.counselling_reasons
      : [];

    if (
      analyticsCounsellingReasonFilter !== "all" &&
      !reasons.includes(analyticsCounsellingReasonFilter)
    ) {
      return false;
    }

    const riskState = getAnalyticsClientRiskState(client);

    if (analyticsCssrsRiskFilter === "pending" && !riskState.isPending) return false;
    if (analyticsCssrsRiskFilter === "completed" && !riskState.hasCompletedCssrs) return false;
    if (analyticsCssrsRiskFilter === "elevated" && !riskState.isElevated) return false;
    if (analyticsCssrsRiskFilter === "recent_behavior" && !riskState.hasRecentBehavior) {
      return false;
    }
    if (analyticsCssrsRiskFilter === "severity_4_5" && !riskState.isSeverityFourOrFive) {
      return false;
    }

    return true;
  }, [
    analyticsCategoryFilter,
    analyticsCounsellingReasonFilter,
    analyticsCssrsRiskFilter,
    analyticsDateBasis,
    analyticsStatusFilter,
    getAnalyticsClientRiskState,
  ]);

  const filteredAnalyticsClientRows = useMemo(
    () => analyticsClientRows.filter((client) => doesAnalyticsClientMatchFilters(client, analyticsDateRangeBounds)),
    [analyticsClientRows, analyticsDateRangeBounds, doesAnalyticsClientMatchFilters]
  );

  const previousAnalyticsClientRows = useMemo(
    () =>
      previousAnalyticsDateRangeBounds.start && previousAnalyticsDateRangeBounds.end
        ? analyticsClientRows.filter((client) =>
            doesAnalyticsClientMatchFilters(client, previousAnalyticsDateRangeBounds)
          )
        : [],
    [analyticsClientRows, doesAnalyticsClientMatchFilters, previousAnalyticsDateRangeBounds]
  );

  const filteredAnalyticsClientIdSet = useMemo(
    () => new Set(filteredAnalyticsClientRows.map((client) => client.id)),
    [filteredAnalyticsClientRows]
  );

  const filteredAnalyticsCssrsRecords = useMemo(
    () =>
      analyticsCssrsRecords.filter((record) =>
        filteredAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsCssrsRecords, filteredAnalyticsClientIdSet]
  );

  const filteredAnalyticsClient4PsRecords = useMemo(
    () =>
      analyticsClient4PsRecords.filter((record) =>
        filteredAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsClient4PsRecords, filteredAnalyticsClientIdSet]
  );

  const filterAnalyticsActivityByClient = useCallback(
    (records: AnalyticsActivityRecord[]) =>
      records.filter((record) => record.client_id && filteredAnalyticsClientIdSet.has(record.client_id)),
    [filteredAnalyticsClientIdSet]
  );

  const filteredAnalyticsProgressNotes = useMemo(
    () => filterAnalyticsActivityByClient(analyticsProgressNotes),
    [analyticsProgressNotes, filterAnalyticsActivityByClient]
  );

  const filteredAnalyticsDocuments = useMemo(
    () => filterAnalyticsActivityByClient(analyticsDocuments),
    [analyticsDocuments, filterAnalyticsActivityByClient]
  );

  const filteredAnalyticsAssessments = useMemo(
    () => filterAnalyticsActivityByClient(analyticsAssessments),
    [analyticsAssessments, filterAnalyticsActivityByClient]
  );

  const filteredAllRepresentativeAnalyticsClientRows = useMemo(
    () =>
      allAnalyticsClientRows.filter((client) =>
        doesAnalyticsClientMatchFilters(client, analyticsDateRangeBounds)
      ),
    [allAnalyticsClientRows, analyticsDateRangeBounds, doesAnalyticsClientMatchFilters]
  );

  const filteredAllRepresentativeAnalyticsClientIdSet = useMemo(
    () => new Set(filteredAllRepresentativeAnalyticsClientRows.map((client) => client.id)),
    [filteredAllRepresentativeAnalyticsClientRows]
  );

  const filterAllRepresentativeAnalyticsActivityByClient = useCallback(
    (records: AnalyticsActivityRecord[]) =>
      records.filter(
        (record) =>
          record.client_id && filteredAllRepresentativeAnalyticsClientIdSet.has(record.client_id)
      ),
    [filteredAllRepresentativeAnalyticsClientIdSet]
  );

  const filteredAllRepresentativeAnalyticsProgressNotes = useMemo(
    () => filterAllRepresentativeAnalyticsActivityByClient(analyticsProgressNotes),
    [analyticsProgressNotes, filterAllRepresentativeAnalyticsActivityByClient]
  );

  const filteredAllRepresentativeAnalyticsDocuments = useMemo(
    () => filterAllRepresentativeAnalyticsActivityByClient(analyticsDocuments),
    [analyticsDocuments, filterAllRepresentativeAnalyticsActivityByClient]
  );

  const filteredAllRepresentativeAnalyticsAssessments = useMemo(
    () => filterAllRepresentativeAnalyticsActivityByClient(analyticsAssessments),
    [analyticsAssessments, filterAllRepresentativeAnalyticsActivityByClient]
  );

  const filteredAllRepresentativeAnalyticsCssrsRecords = useMemo(
    () =>
      analyticsCssrsRecords.filter((record) =>
        filteredAllRepresentativeAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsCssrsRecords, filteredAllRepresentativeAnalyticsClientIdSet]
  );

  const filteredAllRepresentativeAnalyticsClient4PsRecords = useMemo(
    () =>
      analyticsClient4PsRecords.filter((record) =>
        filteredAllRepresentativeAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsClient4PsRecords, filteredAllRepresentativeAnalyticsClientIdSet]
  );

  const clientCountSeries = useMemo(() => {
    const counts = new Map<string, number>();

    filteredAnalyticsClientRows.forEach((client) => {
      const monthKey = getMonthKeyFromDate(client.intake_date || client.created_at);
      if (!monthKey) return;
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([monthKey, value]) => ({
        key: monthKey,
        label: formatMonthKeyLabel(monthKey),
        value,
      }));
  }, [filteredAnalyticsClientRows]);

  const clientCountYearSeries = useMemo(() => {
    const counts = new Map<string, number>();

    filteredAnalyticsClientRows.forEach((client) => {
      const yearKey = getYearLabelFromDate(client.intake_date || client.created_at);
      if (!yearKey) return;
      counts.set(yearKey, (counts.get(yearKey) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([yearKey, value]) => ({
        key: yearKey,
        label: yearKey,
        value,
      }));
  }, [filteredAnalyticsClientRows]);

  const latestIntakeDateKey = useMemo(() => {
    const latestClientWithDate = [...filteredAnalyticsClientRows]
      .filter((client) => client.intake_date || client.created_at)
      .sort((left, right) =>
        getDateKeyFromDate(right.intake_date || right.created_at).localeCompare(
          getDateKeyFromDate(left.intake_date || left.created_at)
        )
      )[0];

    return (
      getDateKeyFromDate(latestClientWithDate?.intake_date || latestClientWithDate?.created_at) ||
      analyticsTodayKey
    );
  }, [filteredAnalyticsClientRows, analyticsTodayKey]);

  const latestIntakeYear =
    getYearLabelFromDate(latestIntakeDateKey) || analyticsTodayKey.slice(0, 4);
  const latestIntakeMonthKey = getMonthKeyFromDate(latestIntakeDateKey) || analyticsTodayKey.slice(0, 7);

  const addMonthsToMonthKey = (monthKey: string, offset: number) => {
    const [yearPart, monthPart] = monthKey.split("-");
    const year = Number(yearPart);
    const monthIndex = Number(monthPart) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
      return monthKey;
    }

    const shiftedDate = new Date(year, monthIndex + offset, 1);
    const shiftedYear = shiftedDate.getFullYear();
    const shiftedMonth = `${shiftedDate.getMonth() + 1}`.padStart(2, "0");

    return `${shiftedYear}-${shiftedMonth}`;
  };

  const visibleIntakeSeries = useMemo(() => {
    const monthlyCounts = new Map(clientCountSeries.map((item) => [item.key, item.value]));
    const yearlyCounts = new Map(clientCountYearSeries.map((item) => [item.key, item.value]));

    if (intakeTimelineGrouping === "year") {
      const yearCount = intakeYearRange === "3Y" ? 3 : 5;
      const endingYear = Number(latestIntakeYear) || Number(analyticsTodayKey.slice(0, 4));

      return Array.from({ length: yearCount }, (_, index) => {
        const year = `${endingYear - yearCount + 1 + index}`;

        return {
          key: year,
          label: year,
          value: yearlyCounts.get(year) ?? 0,
        };
      });
    }

    const monthCount = intakeMonthRange === "6M" ? 6 : 12;

    return Array.from({ length: monthCount }, (_, index) => {
      const monthKey = addMonthsToMonthKey(latestIntakeMonthKey, index - monthCount + 1);

      return {
        key: monthKey,
        label: formatMonthKeyLabel(monthKey),
        value: monthlyCounts.get(monthKey) ?? 0,
      };
    });
  }, [
    analyticsTodayKey,
    clientCountSeries,
    clientCountYearSeries,
    intakeMonthRange,
    intakeTimelineGrouping,
    intakeYearRange,
    latestIntakeMonthKey,
    latestIntakeYear,
  ]);

  const statusDistribution = useMemo(
    () => [
      {
        label: "Active",
        value: filteredAnalyticsClientRows.filter((client) => client.status === "Active").length,
      },
      {
        label: "Terminated",
        value: filteredAnalyticsClientRows.filter((client) => client.status === "Terminated").length,
      },
    ],
    [filteredAnalyticsClientRows]
  );

  const analyticsCategoryLabels = useMemo(
    () => ["Bago", "Himamaylan", "Cauayan", "Uncategorized"] as const,
    []
  );

  const categoryDistribution = useMemo(
    () =>
      analyticsCategoryLabels.map((label) => ({
        label,
        value: filteredAnalyticsClientRows.filter(
          (client) => formatCategoryPath(client.category_path ?? "") === label
        ).length,
      })),
    [analyticsCategoryLabels, filteredAnalyticsClientRows]
  );

  const counsellingReasonDistribution = useMemo(
    () =>
      Array.from(
        filteredAnalyticsClientRows.reduce((map, client) => {
          const reasons = Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons
            : [];

          reasons.forEach((reason: string) => {
            map.set(reason, (map.get(reason) ?? 0) + 1);
          });
          return map;
        }, new Map<string, number>())
      )
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label)),
    [filteredAnalyticsClientRows]
  );

  const clientsWithSuicidalIdeation = useMemo(
    () =>
      filteredAnalyticsClientRows.filter((client) => {
        const reasons = Array.isArray(client.counselling_reasons)
          ? client.counselling_reasons
          : [];
        return reasons.includes("Suicidal Ideation");
      }),
    [filteredAnalyticsClientRows]
  );

  const clientsWithSuicidalIdeationSet = useMemo(
    () => new Set(clientsWithSuicidalIdeation.map((client) => client.id)),
    [clientsWithSuicidalIdeation]
  );

  const cssrsSeverityDistribution = useMemo(
    () =>
      CSSRS_IDEATION_ITEMS.map((item) => ({
        label: `Level ${item.number}`,
        value: filteredAnalyticsCssrsRecords.filter(
          (record) => record.positive_severity === item.number
        ).length,
      })),
    [filteredAnalyticsCssrsRecords]
  );

  const cssrsBehaviorDistribution = useMemo(
    () => [
      {
        label: "Lifetime behavior",
        value: filteredAnalyticsCssrsRecords.filter((record) => record.behavior.lifetime === "yes")
          .length,
      },
      {
        label: "Past 3 months",
        value: filteredAnalyticsCssrsRecords.filter((record) => record.behavior.recent === "yes")
          .length,
      },
    ],
    [filteredAnalyticsCssrsRecords]
  );

  const fourPsCoverageDistribution = useMemo(
    () =>
      FOUR_PS_ROWS.map((row) => ({
        label: row.label.charAt(0) + row.label.slice(1).toLowerCase(),
        value: filteredAnalyticsClient4PsRecords.filter(
          (record) => getClient4PsRowFilledFieldCount(record.form, row.key) > 0
        ).length,
      })),
    [filteredAnalyticsClient4PsRecords]
  );

  const progressNotesActivitySeries = useMemo(
    () => buildSingleActivitySeries(filteredAnalyticsProgressNotes),
    [filteredAnalyticsProgressNotes]
  );

  const documentActivitySeries = useMemo(
    () => buildSingleActivitySeries(filteredAnalyticsDocuments),
    [filteredAnalyticsDocuments]
  );

  const assessmentActivitySeries = useMemo(
    () => buildSingleActivitySeries(filteredAnalyticsAssessments),
    [filteredAnalyticsAssessments]
  );

  const latestClientPoint =
    clientCountSeries.length > 0 ? clientCountSeries[clientCountSeries.length - 1] : null;
  const topCounsellingReason =
    counsellingReasonDistribution.length > 0
      ? counsellingReasonDistribution[0]
      : null;
  const cssrsCompletedCount = filteredAnalyticsCssrsRecords.filter(
    isAnalyticsCssrsRecordComplete
  ).length;
  const cssrsCompletedForIdeationCount = filteredAnalyticsCssrsRecords.filter(
    (record) =>
      clientsWithSuicidalIdeationSet.has(record.client_id) &&
      isAnalyticsCssrsRecordComplete(record)
  ).length;
  const cssrsPendingForIdeationCount = Math.max(
    clientsWithSuicidalIdeation.length - cssrsCompletedForIdeationCount,
    0
  );
  const elevatedCssrsCount = filteredAnalyticsCssrsRecords.filter(
    (record) => (record.positive_severity ?? 0) >= 4
  ).length;
  const totalProgressNoteCount = filteredAnalyticsProgressNotes.length;
  const totalDocumentCount = filteredAnalyticsDocuments.length;
  const totalAssessmentCount = filteredAnalyticsAssessments.length;
  const total4PsStartedCount = filteredAnalyticsClient4PsRecords.filter(
    (record) => getClient4PsFilledFieldCount(record.form) > 0
  ).length;
  const total4PsCompleteCount = filteredAnalyticsClient4PsRecords.filter(
    (record) => Boolean(record.narrative_report?.trim())
  ).length;
  const total4PsNarrativeCount = total4PsCompleteCount;

  const previousAnalyticsClientIdSet = useMemo(
    () => new Set(previousAnalyticsClientRows.map((client) => client.id)),
    [previousAnalyticsClientRows]
  );

  const previousAnalyticsCssrsRecords = useMemo(
    () =>
      analyticsCssrsRecords.filter((record) =>
        previousAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsCssrsRecords, previousAnalyticsClientIdSet]
  );

  const previousAnalyticsClient4PsRecords = useMemo(
    () =>
      analyticsClient4PsRecords.filter((record) =>
        previousAnalyticsClientIdSet.has(record.client_id)
      ),
    [analyticsClient4PsRecords, previousAnalyticsClientIdSet]
  );

  const previousClientsWithSuicidalIdeation = useMemo(
    () =>
      previousAnalyticsClientRows.filter((client) => {
        const reasons = Array.isArray(client.counselling_reasons)
          ? client.counselling_reasons
          : [];
        return reasons.includes("Suicidal Ideation");
      }),
    [previousAnalyticsClientRows]
  );

  const previousClientsWithSuicidalIdeationSet = useMemo(
    () => new Set(previousClientsWithSuicidalIdeation.map((client) => client.id)),
    [previousClientsWithSuicidalIdeation]
  );

  const previousCssrsCompletedForIdeationCount = previousAnalyticsCssrsRecords.filter(
    (record) =>
      previousClientsWithSuicidalIdeationSet.has(record.client_id) &&
      isAnalyticsCssrsRecordComplete(record)
  ).length;

  const previousCssrsPendingForIdeationCount = Math.max(
    previousClientsWithSuicidalIdeation.length - previousCssrsCompletedForIdeationCount,
    0
  );

  const previousElevatedCssrsCount = previousAnalyticsCssrsRecords.filter(
    (record) => (record.positive_severity ?? 0) >= 4
  ).length;
  const previous4PsCompleteCount = previousAnalyticsClient4PsRecords.filter(
    (record) => Boolean(record.narrative_report?.trim())
  ).length;

  const cssrsCompletionRateValue =
    clientsWithSuicidalIdeation.length > 0
      ? (cssrsCompletedForIdeationCount / clientsWithSuicidalIdeation.length) * 100
      : 0;

  const previousCssrsCompletionRateValue =
    previousClientsWithSuicidalIdeation.length > 0
      ? (previousCssrsCompletedForIdeationCount / previousClientsWithSuicidalIdeation.length) * 100
      : 0;

  const hasAnalyticsComparisonPeriod = Boolean(
    previousAnalyticsDateRangeBounds.start && previousAnalyticsDateRangeBounds.end
  );

  const formatPeriodCountComparison = useCallback((currentValue: number, previousValue: number) => {
    if (!hasAnalyticsComparisonPeriod) return analyticsComparisonPeriodLabel;

    const delta = currentValue - previousValue;
    const formattedDelta = `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
    return `${formattedDelta} vs previous period (${previousValue.toLocaleString()} before)`;
  }, [analyticsComparisonPeriodLabel, hasAnalyticsComparisonPeriod]);

  const formatPeriodRateComparison = useCallback((currentValue: number, previousValue: number) => {
    if (!hasAnalyticsComparisonPeriod) return analyticsComparisonPeriodLabel;

    const delta = currentValue - previousValue;
    const formattedDelta = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
    return `${formattedDelta} pts vs previous period (${previousValue.toFixed(1)}% before)`;
  }, [analyticsComparisonPeriodLabel, hasAnalyticsComparisonPeriod]);

  const analyticsSummaryComparisons = useMemo(
    () => ({
      label: analyticsComparisonPeriodLabel,
      filteredClients: formatPeriodCountComparison(
        filteredAnalyticsClientRows.length,
        previousAnalyticsClientRows.length
      ),
      cssrsCompletion: formatPeriodRateComparison(
        cssrsCompletionRateValue,
        previousCssrsCompletionRateValue
      ),
      pendingCssrs: formatPeriodCountComparison(
        cssrsPendingForIdeationCount,
        previousCssrsPendingForIdeationCount
      ),
      elevatedCssrs: formatPeriodCountComparison(elevatedCssrsCount, previousElevatedCssrsCount),
      fourPsComplete: formatPeriodCountComparison(total4PsCompleteCount, previous4PsCompleteCount),
    }),
    [
      analyticsComparisonPeriodLabel,
      formatPeriodCountComparison,
      formatPeriodRateComparison,
      cssrsCompletionRateValue,
      cssrsPendingForIdeationCount,
      elevatedCssrsCount,
      filteredAnalyticsClientRows.length,
      previousAnalyticsClientRows.length,
      previousCssrsCompletionRateValue,
      previousCssrsPendingForIdeationCount,
      previousElevatedCssrsCount,
      previous4PsCompleteCount,
      total4PsCompleteCount,
    ]
  );

  const progressNotesActivityDelta = buildActivityDeltaMeta(progressNotesActivitySeries);
  const documentActivityDelta = buildActivityDeltaMeta(documentActivitySeries);
  const assessmentActivityDelta = buildActivityDeltaMeta(assessmentActivitySeries);

  const recordActivityTrendSeries = useMemo(
    () =>
      buildRecordActivityTrendSeries(
        progressNotesActivitySeries,
        documentActivitySeries,
        assessmentActivitySeries
      ),
    [progressNotesActivitySeries, documentActivitySeries, assessmentActivitySeries]
  );

  const recordActivityPeriodsLabel =
    recordActivityTrendSeries.length > 0
      ? `${recordActivityTrendSeries.length} recent ${
          recordActivityTrendSeries.length === 1 ? "period" : "periods"
        }`
      : "No activity yet";

  const filteredAnalyticsDrilldownClients = useMemo(
    () => filteredAnalyticsClientRows.map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, makeAnalyticsDrilldownClient]
  );

  const pendingCssrsClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => getAnalyticsClientRiskState(client).isPending)
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, getAnalyticsClientRiskState, makeAnalyticsDrilldownClient]
  );

  const completedCssrsClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => getAnalyticsClientRiskState(client).hasCompletedCssrs)
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, getAnalyticsClientRiskState, makeAnalyticsDrilldownClient]
  );

  const elevatedCssrsClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => getAnalyticsClientRiskState(client).isElevated)
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, getAnalyticsClientRiskState, makeAnalyticsDrilldownClient]
  );

  const recentBehaviorClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => getAnalyticsClientRiskState(client).hasRecentBehavior)
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, getAnalyticsClientRiskState, makeAnalyticsDrilldownClient]
  );

  const missingIntakeDateClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => !client.intake_date)
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, makeAnalyticsDrilldownClient]
  );

  const missingCategoryClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => formatCategoryPath(client.category_path ?? "") === "Uncategorized")
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, makeAnalyticsDrilldownClient]
  );

  const missingCounsellingReasonClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => {
          const reasons = Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons
            : [];
          return reasons.length === 0;
        })
        .map(makeAnalyticsDrilldownClient),
    [filteredAnalyticsClientRows, makeAnalyticsDrilldownClient]
  );

  const missingFourPsClients = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => {
          const record = analyticsClient4PsByClientId.get(client.id);
          return !record || !record.narrative_report?.trim();
        })
        .map(makeAnalyticsDrilldownClient),
    [analyticsClient4PsByClientId, filteredAnalyticsClientRows, makeAnalyticsDrilldownClient]
  );

  const analyticsDataQualityItems = useMemo<AnalyticsDataQualityItem[]>(
    () => [
      {
        label: "Missing intake date",
        value: missingIntakeDateClients.length,
        denominator: filteredAnalyticsClientRows.length,
        helpText: "Clients without an intake date use created date for trends.",
        clients: missingIntakeDateClients,
      },
      {
        label: "Uncategorized",
        value: missingCategoryClients.length,
        denominator: filteredAnalyticsClientRows.length,
        helpText: "Clients without a category are listed as Uncategorized.",
        clients: missingCategoryClients,
      },
      {
        label: "Missing counseling reasons",
        value: missingCounsellingReasonClients.length,
        denominator: filteredAnalyticsClientRows.length,
        helpText: "Clients without counseling reasons are not counted in the counseling reason chart.",
        clients: missingCounsellingReasonClients,
      },
      {
        label: "Incomplete 4Ps",
        value: missingFourPsClients.length,
        denominator: filteredAnalyticsClientRows.length,
        helpText: "Clients should have at least one entry for each 4Ps row.",
        clients: missingFourPsClients,
      },
    ],
    [
      filteredAnalyticsClientRows.length,
      missingCategoryClients,
      missingCounsellingReasonClients,
      missingFourPsClients,
      missingIntakeDateClients,
    ]
  );

  const latestRecordDateByClientId = useMemo(() => {
    const map = new Map<string, string>();

    const track = (record: AnalyticsActivityRecord) => {
      if (!record.client_id) return;
      const dateKey = getDateKeyFromDate(record.created_at);
      if (!dateKey) return;

      const existing = map.get(record.client_id);
      if (!existing || dateKey > existing) {
        map.set(record.client_id, dateKey);
      }
    };

    filteredAnalyticsProgressNotes.forEach(track);
    filteredAnalyticsDocuments.forEach(track);
    filteredAnalyticsAssessments.forEach(track);

    return map;
  }, [filteredAnalyticsAssessments, filteredAnalyticsDocuments, filteredAnalyticsProgressNotes]);

  const recentNoteClientIds = useMemo(
    () =>
      new Set(
        filteredAnalyticsProgressNotes
          .filter((note) => getDateKeyFromDate(note.created_at) >= analyticsLast30DaysStartKey)
          .map((note) => note.client_id)
          .filter((clientId): clientId is string => Boolean(clientId))
      ),
    [analyticsLast30DaysStartKey, filteredAnalyticsProgressNotes]
  );

  const activeAnalyticsClients = useMemo(
    () => filteredAnalyticsClientRows.filter((client) => client.status === "Active"),
    [filteredAnalyticsClientRows]
  );

  const activeClientsWithoutRecentNote = useMemo(
    () =>
      activeAnalyticsClients
        .filter((client) => !recentNoteClientIds.has(client.id))
        .map(makeAnalyticsDrilldownClient),
    [activeAnalyticsClients, makeAnalyticsDrilldownClient, recentNoteClientIds]
  );

  const assessmentClientIds = useMemo(
    () =>
      new Set(
        filteredAnalyticsAssessments
          .map((assessment) => assessment.client_id)
          .filter((clientId): clientId is string => Boolean(clientId))
      ),
    [filteredAnalyticsAssessments]
  );

  const clientsWithAssessmentsNoRecentNote = useMemo(
    () =>
      filteredAnalyticsClientRows
        .filter((client) => assessmentClientIds.has(client.id) && !recentNoteClientIds.has(client.id))
        .map(makeAnalyticsDrilldownClient),
    [
      makeAnalyticsDrilldownClient,
      assessmentClientIds,
      filteredAnalyticsClientRows,
      recentNoteClientIds,
    ]
  );

  const activeClientsWithoutActivity = useMemo(
    () =>
      activeAnalyticsClients
        .filter((client) => {
          const latestRecordDate = latestRecordDateByClientId.get(client.id);
          return !latestRecordDate || latestRecordDate < analyticsLast60DaysStartKey;
        })
        .map(makeAnalyticsDrilldownClient),
    [
      activeAnalyticsClients,
      makeAnalyticsDrilldownClient,
      analyticsLast60DaysStartKey,
      latestRecordDateByClientId,
    ]
  );

  const progressNotesLast30DaysCount = filteredAnalyticsProgressNotes.filter(
    (note) => getDateKeyFromDate(note.created_at) >= analyticsLast30DaysStartKey
  ).length;

  const documentsThisMonthCount = filteredAnalyticsDocuments.filter((document) =>
    getMonthKeyFromDate(document.created_at).startsWith(analyticsTodayKey.slice(0, 7))
  ).length;

  const assessmentsThisMonthCount = filteredAnalyticsAssessments.filter((assessment) =>
    getMonthKeyFromDate(assessment.created_at).startsWith(analyticsTodayKey.slice(0, 7))
  ).length;

  const averageNotesPerActiveClient =
    activeAnalyticsClients.length > 0
      ? totalProgressNoteCount / activeAnalyticsClients.length
      : 0;

  const analyticsOperationalMetrics = useMemo<AnalyticsOperationalMetric[]>(
    () => [
      {
        label: "Progress notes in last 30 days",
        value: progressNotesLast30DaysCount.toLocaleString(),
        helpText: "Recent documentation volume for the current filter.",
      },
      {
        label: "Active clients without recent note",
        value: activeClientsWithoutRecentNote.length.toLocaleString(),
        helpText: "Active clients with no progress note in the last 30 days.",
        clients: activeClientsWithoutRecentNote,
      },
      {
        label: "Average notes per active client",
        value: averageNotesPerActiveClient.toFixed(1),
        helpText: `${totalProgressNoteCount.toLocaleString()} notes across ${activeAnalyticsClients.length.toLocaleString()} active clients.`,
      },
      {
        label: "4Ps narrative reports",
        value: total4PsNarrativeCount.toLocaleString(),
        helpText: `${total4PsCompleteCount.toLocaleString()} complete 4Ps records; ${total4PsStartedCount.toLocaleString()} started.`,
      },
      {
        label: "Documents uploaded this month",
        value: documentsThisMonthCount.toLocaleString(),
        helpText: "Document uploads in the current month.",
      },
      {
        label: "Assessments uploaded this month",
        value: assessmentsThisMonthCount.toLocaleString(),
        helpText: "Assessment uploads in the current month.",
      },
      {
        label: "Assessments without recent note",
        value: clientsWithAssessmentsNoRecentNote.length.toLocaleString(),
        helpText: "Clients with assessment files but no progress note in the last 30 days.",
        clients: clientsWithAssessmentsNoRecentNote,
      },
      {
        label: "Active clients inactive 60+ days",
        value: activeClientsWithoutActivity.length.toLocaleString(),
        helpText: "Active clients without notes, documents, or assessments in the last 60 days.",
        clients: activeClientsWithoutActivity,
      },
    ],
    [
      activeAnalyticsClients.length,
      activeClientsWithoutActivity,
      activeClientsWithoutRecentNote,
      assessmentsThisMonthCount,
      averageNotesPerActiveClient,
      clientsWithAssessmentsNoRecentNote,
      documentsThisMonthCount,
      progressNotesLast30DaysCount,
      total4PsCompleteCount,
      total4PsNarrativeCount,
      total4PsStartedCount,
      totalProgressNoteCount,
    ]
  );

  const analyticsDrilldownGroups = useMemo(
    () => ({
      allClients: {
        title: "Filtered clients",
        emptyLabel: "No clients match the current filters.",
        clients: filteredAnalyticsDrilldownClients,
      },
      completedCssrs: {
        title: "C-SSRS completed clients",
        emptyLabel: "No C-SSRS completed clients match the current filters.",
        clients: completedCssrsClients,
      },
      pendingCssrs: {
        title: "Pending C-SSRS clients",
        emptyLabel: "No pending C-SSRS clients match the current filters.",
        clients: pendingCssrsClients,
      },
      elevatedCssrs: {
        title: "Elevated C-SSRS clients",
        emptyLabel: "No elevated C-SSRS clients match the current filters.",
        clients: elevatedCssrsClients,
      },
      recentBehavior: {
        title: "Recent suicidal behavior clients",
        emptyLabel: "No recent behavior clients match the current filters.",
        clients: recentBehaviorClients,
      },
    }),
    [
      completedCssrsClients,
      elevatedCssrsClients,
      filteredAnalyticsDrilldownClients,
      pendingCssrsClients,
      recentBehaviorClients,
    ]
  );

  const analyticsDateRangeSummary =
    analyticsDateRange === "ALL"
      ? null
      : analyticsDateRange === "LAST_30_DAYS"
        ? "Last 30 days"
        : analyticsDateRange === "LAST_90_DAYS"
          ? "Last 90 days"
          : analyticsDateRange === "THIS_YEAR"
            ? "This year"
            : analyticsDateRangeBounds.start || analyticsDateRangeBounds.end
              ? `${analyticsDateRangeBounds.start || "Start"} to ${
                  analyticsDateRangeBounds.end || "today"
                }`
              : "Custom date range";

  const analyticsDateBasisLabel =
    analyticsDateBasis === "intake" ? "intake date" : "record created date";

  const analyticsFilterSummaryParts = [
    analyticsDateRangeSummary,
    `Date basis: ${analyticsDateBasisLabel}`,
    analyticsStatusFilter === "all" ? null : `Status: ${analyticsStatusFilter}`,
    analyticsCategoryFilter === "all" ? null : `Category: ${analyticsCategoryFilter}`,
    analyticsCounsellingReasonFilter === "all"
      ? null
      : `Reason: ${analyticsCounsellingReasonFilter}`,
    analyticsCssrsRiskFilter === "all"
      ? null
      : `C-SSRS: ${analyticsCssrsRiskFilter.replace(/_/g, " ")}`,
  ].filter((part): part is string => Boolean(part));

  const analyticsFilterSummary =
    analyticsFilterSummaryParts.length === 1
      ? `All client analytics by ${analyticsDateBasisLabel}.`
      : analyticsFilterSummaryParts.join(" • ");

  const analyticsCategoryOptions = useMemo<AnalyticsFilterOption[]>(
    () => [
      { value: "all", label: "All categories" },
      ...mergeClientCategoryOptions(
        clientCategoryOptions,
        analyticsClientRows.map((client) => client.category_path)
      ).map((category) => ({ value: category, label: category })),
      { value: "Uncategorized", label: "Uncategorized" },
    ],
    [analyticsClientRows, clientCategoryOptions]
  );

  const selectedAnalyticsClientRows =
    shouldUseAllRepresentativeAnalyticsDataset
      ? filteredAllRepresentativeAnalyticsClientRows
      : filteredAnalyticsClientRows;

  const analyticsDashboardInputs = useMemo<AnalyticsDashboardInputs>(
    () => ({
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
      isAnalyticsCssrsRecordComplete,
      makeAnalyticsDrilldownClient,
    }),
    [
      allAnalyticsClientRows,
      analyticsAssessments,
      analyticsClient4PsByClientId,
      analyticsClient4PsRecords,
      analyticsClientRows,
      analyticsCssrsByClientId,
      analyticsCssrsRecords,
      analyticsDocuments,
      analyticsProgressNotes,
      analyticsTodayKey,
      isAnalyticsCssrsRecordComplete,
      makeAnalyticsDrilldownClient,
    ]
  );

  const analyticsViewModel = useMemo<AnalyticsViewModel>(
    () => ({
      analyticsClientRows: selectedAnalyticsClientRows,
      analyticsAllClientCount: shouldUseAllRepresentativeAnalyticsDataset
        ? allAnalyticsClientRows.length
        : analyticsClientRows.length,
      analyticsProgressNotes: shouldUseAllRepresentativeAnalyticsDataset
        ? filteredAllRepresentativeAnalyticsProgressNotes
        : filteredAnalyticsProgressNotes,
      analyticsDocuments: shouldUseAllRepresentativeAnalyticsDataset
        ? filteredAllRepresentativeAnalyticsDocuments
        : filteredAnalyticsDocuments,
      analyticsAssessments: shouldUseAllRepresentativeAnalyticsDataset
        ? filteredAllRepresentativeAnalyticsAssessments
        : filteredAnalyticsAssessments,
      analyticsCssrsRecords: shouldUseAllRepresentativeAnalyticsDataset
        ? filteredAllRepresentativeAnalyticsCssrsRecords
        : filteredAnalyticsCssrsRecords,
      analyticsClient4PsRecords: shouldUseAllRepresentativeAnalyticsDataset
        ? filteredAllRepresentativeAnalyticsClient4PsRecords
        : filteredAnalyticsClient4PsRecords,
      analyticsDateRange,
      setAnalyticsDateRange,
      analyticsDateBasis,
      setAnalyticsDateBasis,
      analyticsCustomStartDate,
      setAnalyticsCustomStartDate,
      analyticsCustomEndDate,
      setAnalyticsCustomEndDate,
      analyticsStatusFilter,
      setAnalyticsStatusFilter,
      analyticsCategoryFilter,
      setAnalyticsCategoryFilter,
      analyticsCounsellingReasonFilter,
      setAnalyticsCounsellingReasonFilter,
      analyticsCssrsRiskFilter,
      setAnalyticsCssrsRiskFilter,
      analyticsCounsellingReasonOptions,
      analyticsCategoryOptions,
      analyticsFilterSummary,
      analyticsDefaultRepresentativeFilter: shouldDefaultAnalyticsRepresentativeToAssigned
        ? assignedHpcRepresentativeName
        : "",
      canUseAllRepresentativeAnalytics: canUseAllRepresentativeAnalyticsForProfile,
      canUseIndividualRepresentativeAnalytics: canUseIndividualRepresentativeAnalyticsForProfile,
      analyticsSummaryComparisons,
      analyticsDrilldownGroups,
      analyticsDataQualityItems,
      analyticsOperationalMetrics,
      analyticsLoading,
      analyticsMessage,
      analyticsExportStatus,
      isAnalyticsExporting,
      setAnalyticsExportStatus,
      setIsAnalyticsExporting,
      intakeTimelineGrouping,
      setIntakeTimelineGrouping,
      intakeMonthRange,
      setIntakeMonthRange,
      intakeYearRange,
      setIntakeYearRange,
      visibleIntakeSeries,
      statusDistribution,
      categoryDistribution,
      counsellingReasonDistribution,
      clientsWithSuicidalIdeation,
      cssrsSeverityDistribution,
      cssrsBehaviorDistribution,
      fourPsCoverageDistribution,
      latestClientPoint,
      topCounsellingReason,
      cssrsCompletedCount,
      cssrsCompletedForIdeationCount,
      cssrsPendingForIdeationCount,
      elevatedCssrsCount,
      totalProgressNoteCount,
      totalDocumentCount,
      totalAssessmentCount,
      total4PsStartedCount,
      total4PsCompleteCount,
      total4PsNarrativeCount,
      progressNotesActivityDelta,
      documentActivityDelta,
      assessmentActivityDelta,
      recordActivityTrendSeries,
      recordActivityPeriodsLabel,
    }),
    [
      allAnalyticsClientRows.length,
      analyticsCategoryFilter,
      analyticsCategoryOptions,
      analyticsClientRows.length,
      analyticsCounsellingReasonFilter,
      analyticsCounsellingReasonOptions,
      analyticsCssrsRiskFilter,
      analyticsCustomEndDate,
      analyticsCustomStartDate,
      analyticsDataQualityItems,
      analyticsDateBasis,
      analyticsDateRange,
      analyticsDrilldownGroups,
      analyticsExportStatus,
      analyticsFilterSummary,
      analyticsLoading,
      analyticsMessage,
      analyticsOperationalMetrics,
      analyticsStatusFilter,
      analyticsSummaryComparisons,
      assessmentActivityDelta,
      categoryDistribution,
      clientsWithSuicidalIdeation,
      cssrsBehaviorDistribution,
      cssrsCompletedCount,
      cssrsCompletedForIdeationCount,
      cssrsPendingForIdeationCount,
      cssrsSeverityDistribution,
      documentActivityDelta,
      elevatedCssrsCount,
      filteredAllRepresentativeAnalyticsAssessments,
      filteredAllRepresentativeAnalyticsClient4PsRecords,
      filteredAllRepresentativeAnalyticsCssrsRecords,
      filteredAllRepresentativeAnalyticsDocuments,
      filteredAllRepresentativeAnalyticsProgressNotes,
      filteredAnalyticsAssessments,
      filteredAnalyticsClient4PsRecords,
      filteredAnalyticsCssrsRecords,
      filteredAnalyticsDocuments,
      filteredAnalyticsProgressNotes,
      fourPsCoverageDistribution,
      intakeMonthRange,
      intakeTimelineGrouping,
      intakeYearRange,
      isAnalyticsExporting,
      latestClientPoint,
      progressNotesActivityDelta,
      recordActivityPeriodsLabel,
      recordActivityTrendSeries,
      selectedAnalyticsClientRows,
      shouldDefaultAnalyticsRepresentativeToAssigned,
      shouldUseAllRepresentativeAnalyticsDataset,
      assignedHpcRepresentativeName,
      canUseAllRepresentativeAnalyticsForProfile,
      canUseIndividualRepresentativeAnalyticsForProfile,
      statusDistribution,
      topCounsellingReason,
      total4PsCompleteCount,
      total4PsNarrativeCount,
      total4PsStartedCount,
      totalAssessmentCount,
      totalDocumentCount,
      totalProgressNoteCount,
      visibleIntakeSeries,
      counsellingReasonDistribution,
      setAnalyticsCategoryFilter,
      setAnalyticsCssrsRiskFilter,
      setAnalyticsCustomEndDate,
      setAnalyticsCustomStartDate,
      setAnalyticsDateBasis,
      setAnalyticsDateRange,
      setAnalyticsExportStatus,
      setAnalyticsStatusFilter,
      setAnalyticsCounsellingReasonFilter,
      setIntakeMonthRange,
      setIntakeTimelineGrouping,
      setIntakeYearRange,
      setIsAnalyticsExporting,
    ]
  );

  return {
    analyticsClients,
    analyticsDashboardInputs,
    analyticsViewModel,
    loadAnalyticsData,
  };
}
