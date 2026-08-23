import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./analytics.css";
import { SectionHeader } from "../../components/SectionHeader";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import type {
  AnalyticsActivityRecord,
  AnalyticsClient4PsInsight,
  AnalyticsClientDrilldownGroup,
  AnalyticsClientRow,
  AnalyticsCssrsInsight,
  IntakeMonthRange,
  IntakeYearRange,
} from "../../appShared";
import {
  CSSRS_DEMEANOR_GROUPS,
  CSSRS_IDEATION_ITEMS,
  hasCompleteCssrsProtectiveFactorTexts,
  mergeHpcRepresentativeOptions,
} from "../../appShared";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { AnalyticsDrilldownPanel, type DrilldownPageSize } from "./AnalyticsDrilldownPanel";
import {
  analyticsChartColors,
  renderBarDistributionVisual,
  renderDonutChart,
  renderGroupedHorizontalBarChart,
  renderLineAreaChart,
  type AnalyticsGroupedDistributionItem,
} from "./AnalyticsChartRenderers";
import { AnalyticsExportControls } from "./AnalyticsExportControls";
import { AnalyticsFiltersPanel } from "./AnalyticsFiltersPanel";
import { AnalyticsQuickRead, AnalyticsSummaryMetrics } from "./AnalyticsOverview";
import { AppointmentAnalyticsPanel } from "./AppointmentAnalyticsPanel";
import type { AnalyticsViewModel } from "./useAnalyticsViewModel";

type RecordActivityTrendItem = {
  key: string;
  label: string;
  progressNotes: number;
  documents: number;
  assessments: number;
};



export type AnalyticsSectionProps = {
  viewModel: AnalyticsViewModel;
};

const FOUR_PS_ROWS = ["predisposing", "precipitating", "perpetuating", "protective"] as const;
const FOUR_PS_FACTORS = ["biological", "psychological", "social"] as const;

export function AnalyticsSection({ viewModel }: AnalyticsSectionProps) {
  const {
    analyticsClientRows,
    analyticsAllClientCount,
    analyticsProgressNotes,
    analyticsDocuments,
    analyticsAssessments,
    analyticsCssrsRecords,
    analyticsClient4PsRecords,
    analyticsDateRange,
    setAnalyticsDateRange,
    analyticsCustomStartDate,
    setAnalyticsCustomStartDate,
    analyticsCustomEndDate,
    setAnalyticsCustomEndDate,
    analyticsStatusFilter,
    setAnalyticsStatusFilter,
    analyticsCategoryFilter,
    setAnalyticsCategoryFilter,
    analyticsCategoryOptions,
    analyticsFilterSummary,
    analyticsDefaultRepresentativeFilter = "",
    canUseAllRepresentativeAnalytics = false,
    canUseIndividualRepresentativeAnalytics = false,
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
    progressNotesActivityDelta,
    recordActivityPeriodsLabel,
  } = viewModel;
  const [activeDrilldown, setActiveDrilldown] =
    useState<AnalyticsClientDrilldownGroup | null>(null);
  const [drilldownPageSize, setDrilldownPageSize] =
    useState<DrilldownPageSize>("20");
  const [isCsvExporting, setIsCsvExporting] = useState(false);
  const normalizedDefaultRepresentativeFilter = analyticsDefaultRepresentativeFilter.trim();
  const isRepresentativeFilterLocked =
    Boolean(normalizedDefaultRepresentativeFilter) &&
    !canUseAllRepresentativeAnalytics &&
    !canUseIndividualRepresentativeAnalytics;
  const defaultRepresentativeFilterValue = normalizedDefaultRepresentativeFilter || "all";
  const [representativeFilter, setRepresentativeFilter] = useState(
    () => defaultRepresentativeFilterValue
  );
  const hasAppliedRepresentativeDefault = useRef(Boolean(normalizedDefaultRepresentativeFilter));
  const [ageBandFilter, setAgeBandFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState("all");

  useEffect(() => {
    if (isRepresentativeFilterLocked) {
      setRepresentativeFilter(normalizedDefaultRepresentativeFilter);
      return;
    }

    if (
      !canUseAllRepresentativeAnalytics &&
      !canUseIndividualRepresentativeAnalytics &&
      !normalizedDefaultRepresentativeFilter
    ) {
      setRepresentativeFilter("all");
      return;
    }

    if (hasAppliedRepresentativeDefault.current || !normalizedDefaultRepresentativeFilter) {
      return;
    }

    setRepresentativeFilter((currentFilter) =>
      currentFilter === "all" ? normalizedDefaultRepresentativeFilter : currentFilter
    );
    hasAppliedRepresentativeDefault.current = true;
  }, [
    canUseAllRepresentativeAnalytics,
    canUseIndividualRepresentativeAnalytics,
    isRepresentativeFilterLocked,
    normalizedDefaultRepresentativeFilter,
  ]);

  const formatAnalyticsPercentage = useCallback((value: number, total: number) => {
    if (total <= 0) return "0.0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  }, []);

  const hasTextValue = useCallback(
    (value: string | null | undefined) => typeof value === "string" && value.trim().length > 0,
    []
  );

  const formatMonth = useCallback((value: string | null | undefined) => {
    if (!value) return "";

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 7);
    }

    return value.slice(0, 7);
  }, []);

  const formatMonthLabel = useCallback((monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const monthIndex = Number(month) - 1;
    const shortMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (!year || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return monthKey;
    }

    return `${shortMonths[monthIndex]} '${year.slice(-2)}`;
  }, []);

  const parseMonthNumberFromLabel = useCallback((value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return null;

    const numericMonth = Number(normalizedValue);
    if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      return numericMonth;
    }

    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    const monthIndex = monthNames.findIndex(
      (monthName) =>
        normalizedValue === monthName ||
        normalizedValue === monthName.slice(0, 3) ||
        normalizedValue.startsWith(`${monthName} `) ||
        normalizedValue.startsWith(`${monthName.slice(0, 3)} `)
    );

    return monthIndex >= 0 ? monthIndex + 1 : null;
  }, []);

  const normalizeClientMonthKey = useCallback(
    (monthValue: string, yearValue = "") => {
      const normalizedMonthValue = monthValue.trim();
      const normalizedYearValue = yearValue.trim();

      if (/^\d{4}-\d{2}$/.test(normalizedMonthValue)) {
        return normalizedMonthValue;
      }

      if (/^\d{4}-\d{2}-\d{2}/.test(normalizedMonthValue)) {
        return normalizedMonthValue.slice(0, 7);
      }

      const yearMatch =
        normalizedYearValue.match(/\d{4}/) || normalizedMonthValue.match(/\b(20\d{2}|19\d{2})\b/);
      const year = yearMatch?.[1] ?? "";
      const monthNumber = parseMonthNumberFromLabel(normalizedMonthValue);

      if (year && monthNumber) {
        return `${year}-${`${monthNumber}`.padStart(2, "0")}`;
      }

      return "";
    },
    [parseMonthNumberFromLabel]
  );

  const getClientIntakeMonthKey = useCallback((client: AnalyticsClientRow) => {
    const savedMonth = typeof client.intake_month === "string" ? client.intake_month.trim() : "";
    const savedYear = typeof client.intake_year === "string" ? client.intake_year.trim() : "";
    const normalizedSavedMonth = normalizeClientMonthKey(savedMonth, savedYear);

    if (normalizedSavedMonth) {
      return normalizedSavedMonth;
    }

    if (!client.intake_date) {
      return "";
    }

    const parsedDate = new Date(client.intake_date);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 7);
    }

    return normalizeClientMonthKey(client.intake_date, savedYear) || client.intake_date.slice(0, 7);
  }, [normalizeClientMonthKey]);

  const formatYearLabel = useCallback((yearKey: string) => yearKey || "Not dated", []);

  const addMonthsToMonthKey = useCallback((monthKey: string, monthOffset: number) => {
    const [year, month] = monthKey.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return monthKey;
    }

    const date = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
    return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;
  }, []);

  const normalizeText = useCallback(
    (value: string | null | undefined, fallback = "Not specified") => {
      const trimmedValue = typeof value === "string" ? value.trim() : "";
      return trimmedValue || fallback;
    },
    []
  );

  const ageBandOrder = useMemo(() => ["0–17", "18–24", "25–34", "35–44", "45–64", "65+"] as const, []);

  const getAgeBand = useCallback((age: number | null | undefined) => {
    if (typeof age !== "number" || !Number.isFinite(age) || age < 0) return "Not specified";
    if (age <= 17) return "0–17";
    if (age <= 24) return "18–24";
    if (age <= 34) return "25–34";
    if (age <= 44) return "35–44";
    if (age <= 64) return "45–64";
    return "65+";
  }, []);

  const buildDistribution = useCallback(
    (values: Array<string | null | undefined>) => {
      const counts = values.reduce<Record<string, number>>((accumulator, value) => {
        const label = normalizeText(value);
        accumulator[label] = (accumulator[label] ?? 0) + 1;
        return accumulator;
      }, {});

      return Object.entries(counts)
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
    },
    [normalizeText]
  );

  const isPreExistingDiagnosisPresent = useCallback(
    (value: string | null | undefined) => normalizeText(value, "").toLowerCase() === "yes",
    [normalizeText]
  );

  const getFourPsFilledCellCount = useCallback(
    (record?: AnalyticsClient4PsInsight) => {
      if (!record) return 0;

      return FOUR_PS_ROWS.reduce(
        (total, row) =>
          total +
          FOUR_PS_FACTORS.filter((factor) => hasTextValue(record.form?.[row]?.[factor])).length,
        0
      );
    },
    [hasTextValue]
  );

  const hasCompleteFourPsRows = useCallback(
    (record?: AnalyticsClient4PsInsight) => {
      if (!record) return false;

      return FOUR_PS_ROWS.every((row) =>
        FOUR_PS_FACTORS.some((factor) => hasTextValue(record.form?.[row]?.[factor]))
      );
    },
    [hasTextValue]
  );

  const isCssrsComplete = useCallback((record?: AnalyticsCssrsInsight) => {
    if (!record) return false;

    const levelOneItem = CSSRS_IDEATION_ITEMS.find((item) => item.number === 1);
    const levelOneAnswer = levelOneItem ? record.ideation_answers[levelOneItem.id] : null;
    const hasLevelOneAnswer = levelOneAnswer === "yes" || levelOneAnswer === "no";
    const hasMentalStatusSelection = Object.values(record.demeanor_selections ?? {}).some(Boolean);
    const hasCompleteProtectiveFactors = hasCompleteCssrsProtectiveFactorTexts(
      record.protective_factor_texts
    );

    return hasLevelOneAnswer && hasMentalStatusSelection && hasCompleteProtectiveFactors;
  }, []);

  const representativeOptions = useMemo(() => {
    if (isRepresentativeFilterLocked) {
      return normalizedDefaultRepresentativeFilter
        ? [normalizedDefaultRepresentativeFilter]
        : [];
    }

    if (!canUseIndividualRepresentativeAnalytics) {
      return normalizedDefaultRepresentativeFilter
        ? [normalizedDefaultRepresentativeFilter]
        : [];
    }

    const clientRepresentativeOptions = analyticsClientRows.map((client) =>
      normalizeText(client.hpc_representative, "")
    );
    const options = mergeHpcRepresentativeOptions([
      ...clientRepresentativeOptions,
      normalizedDefaultRepresentativeFilter,
    ]);

    if (
      normalizedDefaultRepresentativeFilter &&
      !options.some(
        (option) =>
          option.toLowerCase() === normalizedDefaultRepresentativeFilter.toLowerCase()
      )
    ) {
      return [...options, normalizedDefaultRepresentativeFilter].sort((left, right) =>
        left.localeCompare(right)
      );
    }

    return options;
  }, [
    analyticsClientRows,
    canUseIndividualRepresentativeAnalytics,
    isRepresentativeFilterLocked,
    normalizeText,
    normalizedDefaultRepresentativeFilter,
  ]);

  useEffect(() => {
    if (representativeFilter === "all") {
      if (isRepresentativeFilterLocked && normalizedDefaultRepresentativeFilter) {
        setRepresentativeFilter(normalizedDefaultRepresentativeFilter);
      }
      return;
    }

    const isAllowedRepresentative = representativeOptions.some(
      (option) => option.toLowerCase() === representativeFilter.toLowerCase()
    );

    if (!isAllowedRepresentative) {
      setRepresentativeFilter(normalizedDefaultRepresentativeFilter || "all");
    }
  }, [
    isRepresentativeFilterLocked,
    normalizedDefaultRepresentativeFilter,
    representativeFilter,
    representativeOptions,
  ]);

  const sexOptions = useMemo(
    () =>
      buildDistribution(analyticsClientRows.map((client) => normalizeText(client.sex))).map(
        (item) => item.label
      ),
    [analyticsClientRows, buildDistribution, normalizeText]
  );

  const filteredClientRows = useMemo(
    () =>
      analyticsClientRows.filter((client) => {
        const representative = normalizeText(client.hpc_representative, "Unassigned");
        const ageBand = getAgeBand(client.age);
        const sex = normalizeText(client.sex);

        return (
          (representativeFilter === "all" || representative === representativeFilter) &&
          (ageBandFilter === "all" || ageBand === ageBandFilter) &&
          (sexFilter === "all" || sex === sexFilter)
        );
      }),
    [analyticsClientRows, ageBandFilter, getAgeBand, normalizeText, representativeFilter, sexFilter]
  );

  const filteredClientIdSet = useMemo(
    () => new Set(filteredClientRows.map((client) => client.id)),
    [filteredClientRows]
  );

  const filteredProgressNotes = useMemo(
    () =>
      analyticsProgressNotes.filter(
        (record) => Boolean(record.client_id) && filteredClientIdSet.has(record.client_id as string)
      ),
    [analyticsProgressNotes, filteredClientIdSet]
  );

  const filteredDocuments = useMemo(
    () =>
      analyticsDocuments.filter(
        (record) => Boolean(record.client_id) && filteredClientIdSet.has(record.client_id as string)
      ),
    [analyticsDocuments, filteredClientIdSet]
  );

  const filteredAssessments = useMemo(
    () =>
      analyticsAssessments.filter(
        (record) => Boolean(record.client_id) && filteredClientIdSet.has(record.client_id as string)
      ),
    [analyticsAssessments, filteredClientIdSet]
  );

  const filteredCssrsRecords = useMemo(
    () => analyticsCssrsRecords.filter((record) => filteredClientIdSet.has(record.client_id)),
    [analyticsCssrsRecords, filteredClientIdSet]
  );

  const filteredFourPsRecords = useMemo(
    () => analyticsClient4PsRecords.filter((record) => filteredClientIdSet.has(record.client_id)),
    [analyticsClient4PsRecords, filteredClientIdSet]
  );

  const cssrsByClientId = useMemo(
    () => new Map(filteredCssrsRecords.map((record) => [record.client_id, record])),
    [filteredCssrsRecords]
  );

  const fourPsByClientId = useMemo(
    () => new Map(filteredFourPsRecords.map((record) => [record.client_id, record])),
    [filteredFourPsRecords]
  );

  const clientsWithSuicidalIdeation = useMemo(
    () =>
      filteredClientRows.filter((client) =>
        Array.isArray(client.counselling_reasons)
          ? client.counselling_reasons.includes("Suicidal Ideation")
          : false
      ),
    [filteredClientRows]
  );


  const clientsWithPreExistingDiagnosis = useMemo(
    () =>
      filteredClientRows.filter((client) =>
        isPreExistingDiagnosisPresent(client.pre_existing_psychiatric_diagnosis)
      ),
    [filteredClientRows, isPreExistingDiagnosisPresent]
  );

  const completedCssrsForIdeation = useMemo(
    () =>
      clientsWithSuicidalIdeation.filter((client) =>
        isCssrsComplete(cssrsByClientId.get(client.id))
      ),
    [clientsWithSuicidalIdeation, cssrsByClientId, isCssrsComplete]
  );

  const pendingCssrsForIdeation = useMemo(
    () =>
      clientsWithSuicidalIdeation.filter(
        (client) => !isCssrsComplete(cssrsByClientId.get(client.id))
      ),
    [clientsWithSuicidalIdeation, cssrsByClientId, isCssrsComplete]
  );

  const elevatedCssrsRecords = useMemo(
    () =>
      filteredCssrsRecords.filter((record) => (record.positive_severity ?? 0) >= 4),
    [filteredCssrsRecords]
  );

  const progressNoteClientIds = useMemo(
    () =>
      new Set(
        filteredProgressNotes
          .map((note) => note.client_id)
          .filter((clientId): clientId is string => Boolean(clientId))
      ),
    [filteredProgressNotes]
  );

  const clientsWithProgressNotes = useMemo(
    () => filteredClientRows.filter((client) => progressNoteClientIds.has(client.id)),
    [filteredClientRows, progressNoteClientIds]
  );

  const clientsWithoutProgressNotes = useMemo(
    () => filteredClientRows.filter((client) => !progressNoteClientIds.has(client.id)),
    [filteredClientRows, progressNoteClientIds]
  );

  const totalProgressNoteCount = filteredProgressNotes.length;
  const totalDocumentCount = filteredDocuments.length;
  const totalAssessmentCount = filteredAssessments.length;
  const fourPsRowsCompleteRecords = filteredFourPsRecords.filter(hasCompleteFourPsRows);
  const fourPsRowsCompleteCount = fourPsRowsCompleteRecords.length;
  const total4PsCompleteCount = fourPsRowsCompleteCount;
  const total4PsNarrativeCount = fourPsRowsCompleteRecords.filter((record) =>
    hasTextValue(record.narrative_report)
  ).length;
  const narrativeMissingAfterRowsCompleteCount = fourPsRowsCompleteRecords.filter(
    (record) => !hasTextValue(record.narrative_report)
  ).length;
  const activeClientCount = filteredClientRows.filter((client) => client.status === "Active").length;
  const terminatedClientCount = filteredClientRows.filter(
    (client) => client.status === "Terminated"
  ).length;

  const statusDistribution = useMemo(
    () => buildDistribution(filteredClientRows.map((client) => client.status ?? "Not specified")),
    [filteredClientRows, buildDistribution]
  );

  const categoryDistribution = useMemo(
    () =>
      buildDistribution(
        filteredClientRows.map((client) => {
          const category = normalizeText(client.category_path, "Uncategorized");
          return category.toLowerCase() === "clinic" ? "Uncategorized" : category;
        })
      ),
    [filteredClientRows, buildDistribution, normalizeText]
  );

  const representativeDistribution = useMemo(
    () =>
      buildDistribution(
        filteredClientRows.map((client) => normalizeText(client.hpc_representative, "Unassigned"))
      ),
    [filteredClientRows, buildDistribution, normalizeText]
  );

  const narrativeCoverageGroupedByRepresentative = useMemo<AnalyticsGroupedDistributionItem[]>(() => {
    const representativeLabels = new Set(
      filteredClientRows.map((client) => normalizeText(client.hpc_representative, "Unassigned"))
    );

    return [...representativeLabels]
      .map((label) => {
        const representativeClients = filteredClientRows.filter(
          (client) => normalizeText(client.hpc_representative, "Unassigned") === label
        );

        return {
          label,
          primary: representativeClients.filter((client) =>
            hasCompleteFourPsRows(fourPsByClientId.get(client.id))
          ).length,
          secondary: representativeClients.filter((client) => {
            const fourPsRecord = fourPsByClientId.get(client.id);
            return hasCompleteFourPsRows(fourPsRecord) && hasTextValue(fourPsRecord?.narrative_report);
          }).length,
        };
      })
      .filter((item) => item.primary > 0 || item.secondary > 0)
      .sort(
        (left, right) =>
          right.secondary - left.secondary ||
          right.primary - left.primary ||
          left.label.localeCompare(right.label)
      );
  }, [filteredClientRows, fourPsByClientId, hasCompleteFourPsRows, hasTextValue, normalizeText]);

  const progressNotesByRepresentativeDistribution = useMemo(() => {
    const clientRepresentativeById = new Map(
      filteredClientRows.map((client) => [
        client.id,
        normalizeText(client.hpc_representative, "Unassigned"),
      ])
    );

    return buildDistribution(
      filteredProgressNotes
        .map((record) => (record.client_id ? clientRepresentativeById.get(record.client_id) : null))
        .filter((label): label is string => Boolean(label))
    );
  }, [buildDistribution, filteredClientRows, filteredProgressNotes, normalizeText]);


  const ageDistribution = useMemo(
    () =>
      ageBandOrder.map((label) => ({
        label,
        value: filteredClientRows.filter((client) => getAgeBand(client.age) === label).length,
      })),
    [ageBandOrder, filteredClientRows, getAgeBand]
  );

  const isAggregateOnlyRepresentativeView =
    canUseAllRepresentativeAnalytics &&
    !canUseIndividualRepresentativeAnalytics &&
    Boolean(normalizedDefaultRepresentativeFilter) &&
    representativeFilter === "all";

  const canOpenClientLevelAnalytics = !isAggregateOnlyRepresentativeView;

  const shouldShowRepresentativeBreakdowns = canUseIndividualRepresentativeAnalytics;


  const sexDistribution = useMemo(
    () => buildDistribution(filteredClientRows.map((client) => normalizeText(client.sex))),
    [buildDistribution, filteredClientRows, normalizeText]
  );

  const sexualOrientationDistribution = useMemo(
    () =>
      buildDistribution(
        filteredClientRows.map((client) => normalizeText(client.sexual_orientation))
      ),
    [buildDistribution, filteredClientRows, normalizeText]
  );

  const maritalStatusDistribution = useMemo(
    () => buildDistribution(filteredClientRows.map((client) => normalizeText(client.marital_status))),
    [buildDistribution, filteredClientRows, normalizeText]
  );

  const employmentStatusDistribution = useMemo(
    () =>
      buildDistribution(filteredClientRows.map((client) => normalizeText(client.employment_status))),
    [buildDistribution, filteredClientRows, normalizeText]
  );

  const counsellingReasonDistribution = useMemo(
    () =>
      buildDistribution(
        filteredClientRows.flatMap((client) =>
          Array.isArray(client.counselling_reasons)
            ? client.counselling_reasons.filter((reason) => reason.trim().length > 0)
            : []
        )
      ),
    [buildDistribution, filteredClientRows]
  );

  const multipleConcernsCount = useMemo(
    () =>
      filteredClientRows.filter((client) =>
        Array.isArray(client.counselling_reasons)
          ? client.counselling_reasons.filter((reason) => reason.trim().length > 0).length > 1
          : false
      ).length,
    [filteredClientRows]
  );

  const multipleConcernsDistribution = useMemo(
    () => [
      { label: "Multiple concerns", value: multipleConcernsCount },
      {
        label: "Single or no concern",
        value: Math.max(filteredClientRows.length - multipleConcernsCount, 0),
      },
    ],
    [filteredClientRows.length, multipleConcernsCount]
  );

  const suicidalIdeationDistribution = useMemo(
    () => [
      { label: "With suicidal ideation", value: clientsWithSuicidalIdeation.length },
      {
        label: "Without suicidal ideation",
        value: Math.max(filteredClientRows.length - clientsWithSuicidalIdeation.length, 0),
      },
    ],
    [clientsWithSuicidalIdeation.length, filteredClientRows.length]
  );

  const preExistingDiagnosisDistribution = useMemo(
    () => [
      { label: "Diagnosis indicated", value: clientsWithPreExistingDiagnosis.length },
      {
        label: "No diagnosis indicated",
        value: Math.max(filteredClientRows.length - clientsWithPreExistingDiagnosis.length, 0),
      },
    ],
    [clientsWithPreExistingDiagnosis.length, filteredClientRows.length]
  );

  const cssrsCompletionDistribution = useMemo(
    () => [
      { label: "Pending", value: pendingCssrsForIdeation.length },
      { label: "Completed", value: completedCssrsForIdeation.length },
    ],
    [completedCssrsForIdeation.length, pendingCssrsForIdeation.length]
  );

  const elevatedCssrsDistribution = useMemo(
    () => [
      { label: "Elevated", value: elevatedCssrsRecords.length },
      {
        label: "Not elevated",
        value: Math.max(filteredCssrsRecords.length - elevatedCssrsRecords.length, 0),
      },
    ],
    [elevatedCssrsRecords.length, filteredCssrsRecords.length]
  );

  const fourPsCompletionDistribution = useMemo(
    () => [
      {
        label: "Incomplete",
        value: Math.max(filteredClientRows.length - total4PsCompleteCount, 0),
      },
      { label: "4Ps complete", value: total4PsCompleteCount },
    ],
    [filteredClientRows.length, total4PsCompleteCount]
  );

  const narrativeReportDistribution = useMemo(
    () => [
      {
        label: "No narrative report",
        value: narrativeMissingAfterRowsCompleteCount,
      },
      { label: "Narrative reports", value: total4PsNarrativeCount },
    ],
    [narrativeMissingAfterRowsCompleteCount, total4PsNarrativeCount]
  );

  const cssrsSeverityDistribution = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((level) => ({
        label: `Level ${level}`,
        value: filteredCssrsRecords.filter((record) => record.positive_severity === level).length,
      })),
    [filteredCssrsRecords]
  );

  const cssrsBehaviorDistribution = useMemo(
    () =>
      [
        {
          label: "No behavior",
          value: filteredCssrsRecords.filter(
            (record) => record.behavior.lifetime !== "yes" && record.behavior.recent !== "yes"
          ).length,
        },
        {
          label: "Lifetime",
          value: filteredCssrsRecords.filter(
            (record) => record.behavior.lifetime === "yes" && record.behavior.recent !== "yes"
          ).length,
        },
        {
          label: "Past 3 months",
          value: filteredCssrsRecords.filter(
            (record) => record.behavior.lifetime !== "yes" && record.behavior.recent === "yes"
          ).length,
        },
        {
          label: "Both",
          value: filteredCssrsRecords.filter(
            (record) => record.behavior.lifetime === "yes" && record.behavior.recent === "yes"
          ).length,
        },
      ].sort((left, right) => right.value - left.value || left.label.localeCompare(right.label)),
    [filteredCssrsRecords]
  );

  const cssrsDemeanorLabelByKey = useMemo(() => {
    const toTitleCase = (value: string) =>
      value
        .replace(/_{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

    const getGroupLabel = (groupTitle: string) => {
      const normalized = groupTitle.toLowerCase();

      if (normalized.includes("behavior")) return "Behavior";
      if (normalized.includes("cognitive")) return "Cognitive";
      if (normalized.includes("emotional")) return "Emotional";

      return groupTitle.replace(/\s+State$/i, "");
    };

    return new Map<string, string>(
      CSSRS_DEMEANOR_GROUPS.flatMap((group) =>
        group.items.map((item, index) => {
          const itemLabel = item.toLowerCase().includes("others") ? "Other" : item;
          return [
            `${group.title}-${index}-${item}`,
            `${toTitleCase(itemLabel)} - ${getGroupLabel(group.title)}`,
          ] as const;
        })
      )
    );
  }, []);

  const mentalStatusDistribution = useMemo(() => {
    const counts = filteredCssrsRecords.reduce<Record<string, number>>((accumulator, record) => {
      Object.entries(record.demeanor_selections ?? {}).forEach(([key, selected]) => {
        if (!selected) return;
        const label =
          cssrsDemeanorLabelByKey.get(key) ??
          key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        accumulator[label] = (accumulator[label] ?? 0) + 1;
      });
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  }, [cssrsDemeanorLabelByKey, filteredCssrsRecords]);



  const visibleIntakeSeries = useMemo(() => {
    const counts = new Map<string, number>();

    filteredClientRows.forEach((client) => {
      const monthKey = client.intake_month || formatMonth(client.intake_date);
      const key = intakeTimelineGrouping === "year" ? monthKey.slice(0, 4) : monthKey;
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const rangeLimit =
      intakeTimelineGrouping === "month"
        ? intakeMonthRange === "6M"
          ? 6
          : 12
        : intakeYearRange === "3Y"
          ? 3
          : 5;

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-rangeLimit)
      .map(([key, value]) => ({
        key,
        label: intakeTimelineGrouping === "year" ? formatYearLabel(key) : formatMonthLabel(key),
        value,
      }));
  }, [filteredClientRows, formatMonth, formatMonthLabel, formatYearLabel, intakeMonthRange, intakeTimelineGrouping, intakeYearRange]);

  const latestClientPoint =
    visibleIntakeSeries.length > 0 ? visibleIntakeSeries[visibleIntakeSeries.length - 1] : null;

  const recordActivityTrendSeries = useMemo(() => {
    const counts = new Map<string, RecordActivityTrendItem>();

    const ensurePeriod = (createdAt: string) => {
      const monthKey = formatMonth(createdAt);
      if (!monthKey) return null;

      if (!counts.has(monthKey)) {
        counts.set(monthKey, {
          key: monthKey,
          label: formatMonthLabel(monthKey),
          progressNotes: 0,
          documents: 0,
          assessments: 0,
        });
      }

      return counts.get(monthKey) ?? null;
    };

    filteredProgressNotes.forEach((record) => {
      const period = ensurePeriod(record.created_at);
      if (period) period.progressNotes += 1;
    });
    filteredDocuments.forEach((record) => {
      const period = ensurePeriod(record.created_at);
      if (period) period.documents += 1;
    });
    filteredAssessments.forEach((record) => {
      const period = ensurePeriod(record.created_at);
      if (period) period.assessments += 1;
    });

    return [...counts.values()].sort((left, right) => left.key.localeCompare(right.key)).slice(-12);
  }, [filteredAssessments, filteredDocuments, filteredProgressNotes, formatMonth, formatMonthLabel]);

  const displayedIntakeSeries = useMemo(() => {
    const intakeMonthKeys = filteredClientRows
      .map((client) => getClientIntakeMonthKey(client))
      .filter((monthKey) => monthKey.length > 0)
      .sort();
    const latestMonthKey =
      intakeMonthKeys[intakeMonthKeys.length - 1] ?? formatMonth(new Date().toISOString());

    const monthlyCounts = filteredClientRows.reduce<Map<string, number>>((counts, client) => {
      const monthKey = getClientIntakeMonthKey(client);
      if (!monthKey) return counts;

      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    const yearlyCounts = filteredClientRows.reduce<Map<string, number>>((counts, client) => {
      const yearKey = getClientIntakeMonthKey(client).slice(0, 4);
      if (!yearKey) return counts;

      counts.set(yearKey, (counts.get(yearKey) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    if (intakeTimelineGrouping === "year") {
      const yearCount = intakeYearRange === "3Y" ? 3 : 5;
      const latestYear = Number(latestMonthKey.slice(0, 4)) || new Date().getFullYear();

      return Array.from({ length: yearCount }, (_, index) => {
        const year = `${latestYear - yearCount + 1 + index}`;

        return {
          key: year,
          label: formatYearLabel(year),
          value: yearlyCounts.get(year) ?? 0,
        };
      });
    }

    const monthCount = intakeMonthRange === "6M" ? 6 : 12;

    return Array.from({ length: monthCount }, (_, index) => {
      const monthKey = addMonthsToMonthKey(latestMonthKey, index - monthCount + 1);

      return {
        key: monthKey,
        label: formatMonthLabel(monthKey),
        value: monthlyCounts.get(monthKey) ?? 0,
      };
    });
  }, [
    addMonthsToMonthKey,
    filteredClientRows,
    formatMonth,
    formatMonthLabel,
    formatYearLabel,
    getClientIntakeMonthKey,
    intakeMonthRange,
    intakeTimelineGrouping,
    intakeYearRange,
  ]);

  const activeIntakeRangeOptions =
    intakeTimelineGrouping === "month"
      ? ([
          { value: "6M", label: "6M" },
          { value: "12M", label: "12M" },
        ] as const)
      : ([
          { value: "3Y", label: "3Y" },
          { value: "5Y", label: "5Y" },
        ] as const);

  const activeIntakeRangeValue =
    intakeTimelineGrouping === "month" ? intakeMonthRange : intakeYearRange;

  const localFilterParts = [
    representativeFilter !== "all" ? `Representative: ${representativeFilter}` : null,
    ageBandFilter !== "all" ? `Age group: ${ageBandFilter}` : null,
    sexFilter !== "all" ? `Sex: ${sexFilter}` : null,
  ].filter((part): part is string => Boolean(part));

  const fullFilterSummary =
    localFilterParts.length > 0
      ? `${analyticsFilterSummary} • ${localFilterParts.join(" • ")}`
      : analyticsFilterSummary;

  const toDrilldownClient = (client: AnalyticsClientRow, label = "Filtered client") => ({
    id: client.id,
    client_name: client.client_name ?? null,
    status: client.status,
    category_path: client.category_path ?? "Uncategorized",
    intake_date: client.intake_date ?? null,
    counselling_reasons: Array.isArray(client.counselling_reasons)
      ? client.counselling_reasons
      : [],
    cssrs_risk_label: label,
  });

  const createClientGroupDrilldown = (
    title: string,
    emptyLabel: string,
    clients: AnalyticsClientRow[],
    label = "Filtered client"
  ): AnalyticsClientDrilldownGroup => ({
    title,
    emptyLabel,
    clients: clients.map((client) => toDrilldownClient(client, label)),
  });

  const createDistributionDrilldown = (
    title: string,
    emptyLabel: string,
    predicate: (client: AnalyticsClientRow) => boolean
  ): AnalyticsClientDrilldownGroup => ({
    title,
    emptyLabel,
    clients: filteredClientRows.filter(predicate).map((client) => toDrilldownClient(client)),
  });

  const openAnalyticsDrilldown = (group: AnalyticsClientDrilldownGroup) => {
    if (!canOpenClientLevelAnalytics) return;
    setActiveDrilldown(group);
  };

  const closeAnalyticsDrilldown = () => {
    setActiveDrilldown(null);
  };

  const drilldownPageSizeOptions: Array<{ value: DrilldownPageSize; label: string }> = [
    { value: "20", label: "20" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
    { value: "all", label: "All" },
  ];

  const activeDrilldownLimit =
    drilldownPageSize === "all" ? Number.POSITIVE_INFINITY : Number(drilldownPageSize);
  const visibleDrilldownClients = activeDrilldown
    ? activeDrilldown.clients.slice(0, activeDrilldownLimit)
    : [];
  const activeDrilldownIsLimited = Boolean(
    activeDrilldown && visibleDrilldownClients.length < activeDrilldown.clients.length
  );

  const escapeCsvCell = (value: string | number | null | undefined) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const formatYesNo = (value: boolean) => (value ? "Yes" : "No");

  const countRecordsByClientId = (records: AnalyticsActivityRecord[]) =>
    records.reduce<Record<string, number>>((accumulator, record) => {
      if (!record.client_id) return accumulator;
      accumulator[record.client_id] = (accumulator[record.client_id] ?? 0) + 1;
      return accumulator;
    }, {});

  const latestRecordMonthByClientId = (records: AnalyticsActivityRecord[]) =>
    records.reduce<Record<string, string>>((accumulator, record) => {
      if (!record.client_id) return accumulator;

      const current = accumulator[record.client_id];
      if (!current || new Date(record.created_at).getTime() > new Date(current).getTime()) {
        accumulator[record.client_id] = record.created_at;
      }

      return accumulator;
    }, {});

  const buildAnalyticsCsv = () => {
    const generatedAt = new Date().toISOString();
    const progressNoteCounts = countRecordsByClientId(filteredProgressNotes);
    const documentCounts = countRecordsByClientId(filteredDocuments);
    const assessmentCounts = countRecordsByClientId(filteredAssessments);
    const latestProgressNoteByClient = latestRecordMonthByClientId(filteredProgressNotes);

    const headers = [
      "export_generated_at",
      "export_filter_summary",
      "export_client_id",
      "client_status",
      "category",
      "intake_month",
      "intake_year",
      "created_month",
      "last_updated_month",
      "age",
      "age_band",
      "sex",
      "intake_source",
      "sibling_order",
      "sexual_orientation",
      "marital_status",
      "educational_attainment",
      "employment_status",
      "occupation",
      "partner_age",
      "partner_sexual_orientation",
      "years_together",
      "partner_educational_attainment",
      "partner_employment_status",
      "hpc_representative",
      "counselling_reasons",
      "counselling_reason_count",
      "pre_existing_psychiatric_diagnosis_present",
      "cssrs_needed",
      "cssrs_completed",
      "cssrs_severity_level",
      "cssrs_ideation_positive_count",
      "cssrs_lifetime_behavior",
      "cssrs_recent_behavior",
      "cssrs_suicidal_behavior_count",
      "cssrs_mental_status_selection_count",
      "four_ps_complete",
      "four_ps_filled_cell_count",
      "narrative_report_present",
      "progress_note_count",
      "last_progress_note_month",
      "document_count",
      "assessment_count",
    ];

    const rows: Array<Array<string | number>> = filteredClientRows.map((client, index) => {
      const cssrsRecord = cssrsByClientId.get(client.id);
      const fourPsRecord = fourPsByClientId.get(client.id);
      const counsellingReasons = Array.isArray(client.counselling_reasons)
        ? client.counselling_reasons.filter((reason) => reason.trim().length > 0)
        : [];
      const cssrsNeeded = counsellingReasons.includes("Suicidal Ideation");
      const cssrsIdeationPositiveCount = cssrsRecord
        ? Object.values(cssrsRecord.ideation_answers ?? {}).filter((answer) => answer === "yes")
            .length
        : 0;
      const cssrsLifetimeBehavior = cssrsRecord?.behavior.lifetime === "yes";
      const cssrsRecentBehavior = cssrsRecord?.behavior.recent === "yes";
      const cssrsSuicidalBehaviorCount =
        (cssrsLifetimeBehavior ? 1 : 0) + (cssrsRecentBehavior ? 1 : 0);
      const cssrsMentalStatusSelectionCount = cssrsRecord
        ? Object.values(cssrsRecord.demeanor_selections ?? {}).filter(Boolean).length
        : 0;
      const fourPsFilledCellCount = getFourPsFilledCellCount(fourPsRecord);
      const narrativeReportPresent = hasTextValue(fourPsRecord?.narrative_report);
      const fourPsComplete = narrativeReportPresent;

      return [
        generatedAt,
        fullFilterSummary,
        `CLIENT-${String(index + 1).padStart(3, "0")}`,
        client.status ?? "",
        client.category_path || "Uncategorized",
        client.intake_month || formatMonth(client.intake_date),
        client.intake_year || formatMonth(client.intake_date).slice(0, 4),
        formatMonth(client.created_at),
        formatMonth(client.updated_at),
        typeof client.age === "number" ? client.age : "",
        getAgeBand(client.age),
        client.sex ?? "",
        client.intake_source ?? "",
        client.sibling_order ?? "",
        client.sexual_orientation ?? "",
        client.marital_status ?? "",
        client.educational_attainment ?? "",
        client.employment_status ?? "",
        client.occupation ?? "",
        typeof client.partner_age === "number" ? client.partner_age : "",
        client.partner_sexual_orientation ?? "",
        typeof client.years_together === "number" ? client.years_together : "",
        client.partner_educational_attainment ?? "",
        client.partner_employment_status ?? "",
        client.hpc_representative ?? "",
        counsellingReasons.join("; "),
        counsellingReasons.length,
        formatYesNo(isPreExistingDiagnosisPresent(client.pre_existing_psychiatric_diagnosis)),
        formatYesNo(cssrsNeeded),
        formatYesNo(isCssrsComplete(cssrsRecord)),
        cssrsRecord?.positive_severity ?? "",
        cssrsIdeationPositiveCount,
        formatYesNo(cssrsLifetimeBehavior),
        formatYesNo(cssrsRecentBehavior),
        cssrsSuicidalBehaviorCount,
        cssrsMentalStatusSelectionCount,
        formatYesNo(fourPsComplete),
        fourPsFilledCellCount,
        formatYesNo(narrativeReportPresent),
        progressNoteCounts[client.id] ?? 0,
        formatMonth(latestProgressNoteByClient[client.id]),
        documentCounts[client.id] ?? 0,
        assessmentCounts[client.id] ?? 0,
      ];
    });

    return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  };

  const handleAnalyticsCsvExport = async () => {
    if (isCsvExporting) return;

    if (!canOpenClientLevelAnalytics) {
      setAnalyticsExportStatus(
        "CSV export is available only for your assigned representative view."
      );
      return;
    }

    setIsCsvExporting(true);
    setAnalyticsExportStatus(feedbackMessages.loading("Preparing de-identified client data CSV export"));

    try {
      const fileDateStamp = new Date().toISOString().slice(0, 10);
      const fileName = `hpc-client-data-deidentified-${fileDateStamp}.csv`;
      const selectedSavePath = await save({
        title: "Save de-identified client data CSV",
        defaultPath: fileName,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (!selectedSavePath) {
        setAnalyticsExportStatus(feedbackMessages.cancelled("CSV export"));
        return;
      }

      const finalSavePath =
        selectedSavePath.toLowerCase().endsWith(".csv")
          ? selectedSavePath
          : `${selectedSavePath}.csv`;

      await writeFile(finalSavePath, new TextEncoder().encode(buildAnalyticsCsv()));
      setAnalyticsExportStatus(`De-identified client data CSV saved to ${finalSavePath}.`);
    } catch (error) {
      const message = getErrorDetail(error, "Unknown CSV export error");
      setAnalyticsExportStatus(feedbackMessages.error("We could not create the CSV export.", message));
    } finally {
      setIsCsvExporting(false);
    }
  };

  const handleAnalyticsPresentationExport = () => {
    if (isAnalyticsExporting) return;

    setAnalyticsExportStatus(feedbackMessages.loading("Loading presentation tools"));
    setIsAnalyticsExporting(true);

    void import("./exportAnalyticsPresentation")
      .then(({ exportAnalyticsPresentation }) =>
        exportAnalyticsPresentation({
          isAnalyticsExporting: false,
          setAnalyticsExportStatus,
          setIsAnalyticsExporting,
          analyticsClientRows: filteredClientRows,
          analyticsProgressNotes: filteredProgressNotes,
          analyticsDocuments: filteredDocuments,
          analyticsAssessments: filteredAssessments,
          analyticsCssrsRecords: filteredCssrsRecords,
          analyticsClient4PsRecords: filteredFourPsRecords,
          analyticsFilterSummary: fullFilterSummary,
          visibleIntakeSeries,
          ageDistribution,
          sexDistribution,
          sexualOrientationDistribution,
          maritalStatusDistribution,
          employmentStatusDistribution,
          representativeDistribution: shouldShowRepresentativeBreakdowns
            ? representativeDistribution
            : [],
          narrativeCoverageGroupedByRepresentative: shouldShowRepresentativeBreakdowns
            ? narrativeCoverageGroupedByRepresentative
            : [],
          progressNotesByRepresentativeDistribution: shouldShowRepresentativeBreakdowns
            ? progressNotesByRepresentativeDistribution
            : [],
          statusDistribution,
          categoryDistribution,
          counsellingReasonDistribution,
          clientsWithSuicidalIdeation,
          clientsWithPreExistingDiagnosis,
          cssrsCompletedForIdeationCount: completedCssrsForIdeation.length,
          cssrsPendingForIdeationCount: pendingCssrsForIdeation.length,
          elevatedCssrsCount: elevatedCssrsRecords.length,
          cssrsSeverityDistribution,
          cssrsBehaviorDistribution,
          mentalStatusDistribution,
          totalProgressNoteCount,
          totalDocumentCount,
          totalAssessmentCount,
          clientsWithProgressNotesCount: clientsWithProgressNotes.length,
          clientsWithoutProgressNotesCount: clientsWithoutProgressNotes.length,
          total4PsCompleteCount,
          total4PsNarrativeCount,
          recordActivityTrendSeries,
          latestClientPoint,
        })
      )
      .catch((error: unknown) => {
        const message = getErrorDetail(error, "Unknown presentation module error");
        setAnalyticsExportStatus(feedbackMessages.error("We could not create the presentation.", message));
        setIsAnalyticsExporting(false);
      });
  };

  const summaryCards = [
    {
      label: "Total Clients",
      value: filteredClientRows.length.toLocaleString(),
      meta:
        analyticsAllClientCount === filteredClientRows.length
          ? latestClientPoint
            ? `Latest intake period: ${latestClientPoint.label}`
            : "No intake records yet"
          : `${filteredClientRows.length} shown from ${analyticsAllClientCount} total records`,
      comparison: "Filtered client records",
      drilldownGroup: createClientGroupDrilldown(
        "Filtered clients",
        "No clients match the current filters.",
        filteredClientRows
      ),
    },
    {
      label: "Active Clients",
      value: activeClientCount.toLocaleString(),
      meta: `${formatAnalyticsPercentage(activeClientCount, filteredClientRows.length)} of filtered clients`,
      comparison: `${terminatedClientCount} terminated`,
      drilldownGroup: createDistributionDrilldown(
        "Active clients",
        "No active clients match the current filters.",
        (client) => client.status === "Active"
      ),
    },
    {
      label: "Terminated Clients",
      value: terminatedClientCount.toLocaleString(),
      meta: `${formatAnalyticsPercentage(terminatedClientCount, filteredClientRows.length)} of filtered clients`,
      comparison: "Closed or completed records",
      drilldownGroup: createDistributionDrilldown(
        "Terminated clients",
        "No terminated clients match the current filters.",
        (client) => client.status === "Terminated"
      ),
    },
    {
      label: "C-SSRS Needed",
      value: clientsWithSuicidalIdeation.length.toLocaleString(),
      meta: `${completedCssrsForIdeation.length} completed`,
      comparison: `${pendingCssrsForIdeation.length} pending`,
      drilldownGroup: createClientGroupDrilldown(
        "Clients needing C-SSRS",
        "No filtered clients are flagged for Suicidal Ideation.",
        clientsWithSuicidalIdeation,
        "C-SSRS applies"
      ),
    },
    {
      label: "4Ps Complete",
      value: total4PsCompleteCount.toLocaleString(),
      meta: `${formatAnalyticsPercentage(total4PsCompleteCount, filteredClientRows.length)} of filtered clients`,
      comparison: `${fourPsRowsCompleteCount} records have all 4Ps rows filled`,
      drilldownGroup: createClientGroupDrilldown(
        "Clients with complete 4Ps",
        "No clients have complete 4Ps records yet.",
        filteredClientRows.filter((client) => hasCompleteFourPsRows(fourPsByClientId.get(client.id))),
        "4Ps complete"
      ),
    },
    {
      label: "Progress Notes",
      value: totalProgressNoteCount.toLocaleString(),
      meta: `${clientsWithProgressNotes.length} clients with notes`,
      comparison: progressNotesActivityDelta.message,
      drilldownGroup: createClientGroupDrilldown(
        "Clients with progress notes",
        "No filtered clients have progress notes yet.",
        clientsWithProgressNotes,
        "Has progress notes"
      ),
    },
  ];

  const analyticsExportControls = (
    <AnalyticsExportControls
      analyticsLoading={analyticsLoading}
      isCsvExporting={isCsvExporting}
      isAnalyticsExporting={isAnalyticsExporting}
      canOpenClientLevelAnalytics={canOpenClientLevelAnalytics}
      analyticsExportStatus={analyticsExportStatus}
      onCsvExport={handleAnalyticsCsvExport}
      onPresentationExport={handleAnalyticsPresentationExport}
    />
  );

  const documentationCoverage = formatAnalyticsPercentage(
    clientsWithProgressNotes.length,
    filteredClientRows.length,
  );
  const analyticsQuickRead = [
    {
      label: "Active caseload",
      value: `${activeClientCount.toLocaleString()} of ${filteredClientRows.length.toLocaleString()}`,
      detail: "clients are currently active",
      tone: "positive",
    },
    {
      label: "Risk follow-up",
      value: pendingCssrsForIdeation.length.toLocaleString(),
      detail:
        pendingCssrsForIdeation.length === 1
          ? "C-SSRS screening is pending"
          : "C-SSRS screenings are pending",
      tone: pendingCssrsForIdeation.length > 0 ? "attention" : "positive",
    },
    {
      label: "Note coverage",
      value: documentationCoverage,
      detail: "of filtered clients have progress notes",
      tone: "information",
    },
  ];

  return (
    <div className="page-content analytics-page">
      <WorkspaceHeader
        eyebrow="Clinical intelligence"
        title="Analytics"
        description="Understand caseload patterns, documentation coverage, and clinical workflow for the selected view."
        meta={
          <>
            <strong>{filteredClientRows.length.toLocaleString()} clients</strong>
            <span>included in the current view</span>
          </>
        }
        actions={<div className="analytics-header-actions">{analyticsExportControls}</div>}
      />

      {(analyticsLoading || analyticsMessage) && (
        <p className="analytics-status-message">
          {analyticsLoading ? feedbackMessages.loading("Loading analytics") : analyticsMessage}
        </p>
      )}

      <AnalyticsFiltersPanel
        fullFilterSummary={fullFilterSummary}
        analyticsDateRange={analyticsDateRange}
        setAnalyticsDateRange={setAnalyticsDateRange}
        analyticsCustomStartDate={analyticsCustomStartDate}
        setAnalyticsCustomStartDate={setAnalyticsCustomStartDate}
        analyticsCustomEndDate={analyticsCustomEndDate}
        setAnalyticsCustomEndDate={setAnalyticsCustomEndDate}
        analyticsStatusFilter={analyticsStatusFilter}
        setAnalyticsStatusFilter={setAnalyticsStatusFilter}
        analyticsCategoryFilter={analyticsCategoryFilter}
        setAnalyticsCategoryFilter={setAnalyticsCategoryFilter}
        analyticsCategoryOptions={analyticsCategoryOptions}
        representativeFilter={representativeFilter}
        setRepresentativeFilter={setRepresentativeFilter}
        representativeOptions={representativeOptions}
        defaultRepresentativeFilterValue={defaultRepresentativeFilterValue}
        isRepresentativeFilterLocked={isRepresentativeFilterLocked}
        isAggregateOnlyRepresentativeView={isAggregateOnlyRepresentativeView}
        canUseAllRepresentativeAnalytics={canUseAllRepresentativeAnalytics}
        ageBandFilter={ageBandFilter}
        setAgeBandFilter={setAgeBandFilter}
        ageBandOrder={ageBandOrder}
        sexFilter={sexFilter}
        setSexFilter={setSexFilter}
        sexOptions={sexOptions}
      />

      <AppointmentAnalyticsPanel />

      <AnalyticsQuickRead
        filterSummary={fullFilterSummary}
        items={analyticsQuickRead}
      />

      <AnalyticsSummaryMetrics
        cards={summaryCards}
        canOpenClientLevelAnalytics={canOpenClientLevelAnalytics}
        onOpenDrilldown={openAnalyticsDrilldown}
      />

      <AnalyticsDrilldownPanel
        activeDrilldown={activeDrilldown}
        drilldownPageSize={drilldownPageSize}
        setDrilldownPageSize={setDrilldownPageSize}
        drilldownPageSizeOptions={drilldownPageSizeOptions}
        visibleDrilldownClients={visibleDrilldownClients}
        activeDrilldownIsLimited={activeDrilldownIsLimited}
        closeAnalyticsDrilldown={closeAnalyticsDrilldown}
      />

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="2. Client Population"
          description="Intake volume, status, categories, and HPC Representative assignment."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-stack analytics-population-dashboard-grid">
          <section className="panel analytics-panel analytics-panel-tall">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Clients over time"
              description="Intake activity grouped by month or year."
              descriptionClassName="analytics-panel-supporting-copy"
              actions={
                <div className="analytics-panel-control-cluster">
                  <div className="analytics-segmented-controls" role="group" aria-label="Intake range">
                    {activeIntakeRangeOptions.map((option) => (
                      <button
                        type="button"
                        className={
                          activeIntakeRangeValue === option.value
                            ? "analytics-segmented-control active"
                            : "analytics-segmented-control"
                        }
                        key={option.value}
                        onClick={() => {
                          if (intakeTimelineGrouping === "month") {
                            setIntakeMonthRange(option.value as IntakeMonthRange);
                          } else {
                            setIntakeYearRange(option.value as IntakeYearRange);
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="analytics-segmented-controls" role="group" aria-label="Client intake grouping">
                    <button
                      type="button"
                      className={
                        intakeTimelineGrouping === "month"
                          ? "analytics-segmented-control active"
                          : "analytics-segmented-control"
                      }
                      onClick={() => setIntakeTimelineGrouping("month")}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      className={
                        intakeTimelineGrouping === "year"
                          ? "analytics-segmented-control active"
                          : "analytics-segmented-control"
                      }
                      onClick={() => setIntakeTimelineGrouping("year")}
                    >
                      Year
                    </button>
                  </div>
                </div>
              }
            />

            {renderLineAreaChart(displayedIntakeSeries, "No intake data matches the current filters.")}
          </section>

          <div className="analytics-population-comparison-grid">
            <div className="analytics-population-left-column">
              <section className="panel analytics-panel analytics-compact-donut-panel">
                <SectionHeader
                  className="analytics-panel-header"
                  kicker="Active vs Terminated"
                />
                {renderDonutChart(
                  statusDistribution,
                  "No client status data is available yet.",
                  "clients",
                  undefined,
                  analyticsChartColors.status,
                  {
                    centerItemLabel: "Active",
                    centerLabel: "Active clients",
                    centerMode: "item",
                    className: "analytics-donut-legend-below",
                  }
                )}
              </section>

              <section className="panel analytics-panel">
                <SectionHeader
                  className="analytics-panel-header"
                  kicker="Clients by Category"
                />
                {renderBarDistributionVisual(
                  categoryDistribution,
                  "No category data is available yet."
                )}
              </section>
            </div>

            {shouldShowRepresentativeBreakdowns && (
              <section className="panel analytics-panel analytics-population-representative-panel">
                <SectionHeader
                  className="analytics-panel-header"
                  kicker="Clients by HPC Representative"
                />
                {renderBarDistributionVisual(
                  representativeDistribution,
                  "No HPC Representative data is available yet."
                )}
              </section>
            )}
          </div>
        </div>
      </section>

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="3. Demographics"
          description="Client profile based on structured intake fields."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-demographics-stack analytics-demographics-ring-grid">
          <section className="panel analytics-panel analytics-demographic-ring-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Age Groups"
            />
            {renderDonutChart(
              ageDistribution,
              "No age data is available yet.",
              "clients",
              undefined,
              undefined,
              {
                centerMode: "topItem",
                showCenterPercentage: true,
              }
            )}
          </section>

          <section className="panel analytics-panel analytics-demographic-ring-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Sex"
            />
            {renderDonutChart(
              sexDistribution,
              "No sex data is available yet.",
              "clients",
              undefined,
              undefined,
              {
                centerMode: "topItem",
                showCenterPercentage: true,
              }
            )}
          </section>

          <section className="panel analytics-panel analytics-demographic-ring-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Sexual orientation"
            />
            {renderDonutChart(
              sexualOrientationDistribution,
              "No sexual orientation data is available yet.",
              "clients",
              undefined,
              undefined,
              {
                centerMode: "topItem",
                showCenterPercentage: true,
              }
            )}
          </section>

          <section className="panel analytics-panel analytics-demographic-ring-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Marital status"
            />
            {renderDonutChart(
              maritalStatusDistribution,
              "No marital status data is available yet.",
              "clients",
              undefined,
              undefined,
              {
                centerMode: "topItem",
                showCenterPercentage: true,
              }
            )}
          </section>

          <section className="panel analytics-panel analytics-demographic-ring-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Employment status"
            />
            {renderDonutChart(
              employmentStatusDistribution,
              "No employment status data is available yet.",
              "clients",
              undefined,
              undefined,
              {
                centerMode: "topItem",
                showCenterPercentage: true,
              }
            )}
          </section>
        </div>
      </section>

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="4. Presenting Concerns"
          description="Counseling reasons, complexity, suicidal ideation, and diagnosis indicators."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-stack analytics-presenting-dashboard-grid">
          <section className="panel analytics-panel analytics-presenting-reasons-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Top Counseling Reasons"
              actions={<span className="analytics-panel-note">By client count</span>}
            />
            {renderBarDistributionVisual(
              counsellingReasonDistribution.slice(0, 10),
              "No counseling reasons are available yet."
            )}
          </section>

          <section className="panel analytics-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Multiple Concerns"
              actions={<span className="analytics-panel-note">More than one reason</span>}
            />
            {renderDonutChart(
              multipleConcernsDistribution,
              "No counseling reason data is available yet.",
              "clients",
              undefined,
              analyticsChartColors.multipleConcerns,
              {
                centerItemLabel: "Multiple concerns",
                centerLabel: "Multiple concerns",
                centerMode: "item",
              }
            )}
          </section>

          <section className="panel analytics-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Suicidal Ideation"
              actions={<span className="analytics-panel-note">Counseling reason</span>}
            />
            {renderDonutChart(
              suicidalIdeationDistribution,
              "No suicidal ideation data is available yet.",
              "clients",
              undefined,
              analyticsChartColors.suicidalIdeation,
              {
                centerItemLabel: "With suicidal ideation",
                centerLabel: "With suicidal ideation",
                centerMode: "item",
              }
            )}
          </section>

          <section className="panel analytics-panel">
            <SectionHeader
              className="analytics-panel-header"
              kicker="Pre-existing Psychiatric Diagnosis"
              actions={<span className="analytics-panel-note">Intake indicator</span>}
            />
            {renderDonutChart(
              preExistingDiagnosisDistribution,
              "No psychiatric diagnosis data is available yet.",
              "clients",
              undefined,
              analyticsChartColors.preExistingDiagnosis,
              {
                centerItemLabel: "Diagnosis indicated",
                centerLabel: "Diagnosis indicated",
                centerMode: "item",
              }
            )}
          </section>
        </div>
      </section>

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="5. C-SSRS Risk (Suicidal Ideation Clients Only)"
          description="Completion, severity, behavior, and mental-status patterns among ideation-flagged clients."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-stack analytics-cssrs-dashboard-grid">
          <div className="analytics-cssrs-row analytics-cssrs-risk-row-primary">
            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="C-SSRS Completion"
                actions={
                  <span className="analytics-panel-note">
                    {completedCssrsForIdeation.length} completed / {pendingCssrsForIdeation.length} Pending
                  </span>
                }
              />
              {renderDonutChart(
                cssrsCompletionDistribution,
                "No C-SSRS completion data is available yet.",
                "clients",
                undefined,
                analyticsChartColors.cssrsCompletion,
                {
                  centerItemLabel: "Pending",
                  centerLabel: "Pending",
                  centerMode: "item",
                  className: "analytics-donut-legend-below",
                }
              )}
            </section>

            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Elevated C-SSRS"
                description="Severity level 4–5"
                descriptionClassName="analytics-panel-subnote"
              />
              {renderDonutChart(
                elevatedCssrsDistribution,
                "No elevated C-SSRS data is available yet.",
                "clients",
                undefined,
                analyticsChartColors.elevatedCssrs,
                {
                  centerItemLabel: "Elevated",
                  centerLabel: "Elevated",
                  centerMode: "item",
                  className: "analytics-donut-legend-below",
                }
              )}
            </section>

            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Severity Level Distribution"
              />
              {renderBarDistributionVisual(
                cssrsSeverityDistribution,
                "No C-SSRS severity data is available yet.",
                undefined,
                (item) => analyticsChartColors.cssrsSeverity(item.label)
              )}
            </section>
          </div>

          <div className="analytics-cssrs-row analytics-cssrs-risk-row-secondary">
            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Suicidal Behavior Distribution"
              />
              {renderBarDistributionVisual(
                cssrsBehaviorDistribution,
                "No C-SSRS behavior data is available yet."
              )}
            </section>

            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Mental Status Interview Frequency"
              />
              {renderBarDistributionVisual(
                mentalStatusDistribution,
                "No Mental Status Interview selections are available yet."
              )}
            </section>
          </div>
        </div>
      </section>

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="6. 4Ps / Narrative Report"
          description="Case conceptualization completion and narrative report coverage."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-stack analytics-fourps-dashboard-grid">
          <div className="analytics-record-activity-grid analytics-4ps-metric-grid-two">
            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="4Ps Complete"
                actions={
                  <span className="analytics-panel-note">
                    {formatAnalyticsPercentage(total4PsCompleteCount, filteredClientRows.length)} of filtered clients
                  </span>
                }
              />
              {renderDonutChart(
                fourPsCompletionDistribution,
                "No 4Ps completion data is available yet.",
                "clients",
                undefined,
                analyticsChartColors.fourPsCompletion,
                {
                  centerItemLabel: "Incomplete",
                  centerLabel: "Incomplete",
                  centerMode: "item",
                  className: "analytics-donut-legend-below",
                }
              )}
            </section>

            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Narrative Reports"
                actions={
                  <span className="analytics-panel-note">
                    {narrativeMissingAfterRowsCompleteCount} complete 4Ps without narrative
                  </span>
                }
              />
              {renderDonutChart(
                narrativeReportDistribution,
                "No narrative report data is available yet.",
                "clients",
                undefined,
                analyticsChartColors.narrativeReport,
                {
                  centerItemLabel: "No narrative report",
                  centerLabel: "No narrative report",
                  centerMode: "item",
                  className: "analytics-donut-legend-below",
                }
              )}
            </section>
          </div>

          {shouldShowRepresentativeBreakdowns && (
            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Narrative Report Coverage by HPC Representative"
              />
              {renderGroupedHorizontalBarChart(
                narrativeCoverageGroupedByRepresentative,
                "No 4Ps or narrative report coverage is available by representative yet.",
                "4Ps Complete",
                "Narrative Reports"
              )}
            </section>
          )}
        </div>
      </section>

      <section className="analytics-section">
        <SectionHeader
          className="analytics-section-header"
          kicker="7. Records Activity"
          description="Progress notes, uploaded files, assessments, and documentation trends."
          descriptionClassName="analytics-section-copy"
        />

        <div className="analytics-stack analytics-records-dashboard-grid">
          <div className="analytics-record-activity-grid analytics-record-activity-grid-four">
            <article className="analytics-record-card">
              <div className="analytics-record-card-copy">
                <span className="analytics-record-card-title">Progress Notes</span>
                <strong className="analytics-record-card-value">
                  {totalProgressNoteCount.toLocaleString()}
                </strong>
                <span className={`analytics-record-card-delta ${progressNotesActivityDelta.direction}`}>
                  {progressNotesActivityDelta.message}
                </span>
              </div>
            </article>

            <article className="analytics-record-card">
              <div className="analytics-record-card-copy">
                <span className="analytics-record-card-title">Documents</span>
                <strong className="analytics-record-card-value">
                  {totalDocumentCount.toLocaleString()}
                </strong>
                <span className="analytics-record-card-delta flat">
                  Uploaded document records
                </span>
              </div>
            </article>

            <article className="analytics-record-card">
              <div className="analytics-record-card-copy">
                <span className="analytics-record-card-title">Assessments</span>
                <strong className="analytics-record-card-value">
                  {totalAssessmentCount.toLocaleString()}
                </strong>
                <span className="analytics-record-card-delta flat">
                  Uploaded assessment records
                </span>
              </div>
            </article>

            <article className="analytics-record-card">
              <div className="analytics-record-card-copy">
                <span className="analytics-record-card-title">Clients without Progress Notes</span>
                <strong className="analytics-record-card-value">
                  {clientsWithoutProgressNotes.length.toLocaleString()}
                </strong>
                <span className="analytics-record-card-delta flat">
                  No progress notes recorded yet
                </span>
              </div>
            </article>
          </div>

          <div className="analytics-records-chart-grid">
            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Progress Notes Over Time"
                description="Progress note volume across the selected period."
                descriptionClassName="analytics-panel-supporting-copy"
                actions={<span className="analytics-panel-note">{recordActivityPeriodsLabel}</span>}
              />

              {renderLineAreaChart(
                recordActivityTrendSeries.map((item) => ({
                  label: item.label,
                  value: item.progressNotes,
                })),
                "No progress notes are available yet."
              )}
            </section>

            {shouldShowRepresentativeBreakdowns && (
              <section className="panel analytics-panel">
                <SectionHeader
                  className="analytics-panel-header"
                  kicker="Progress Notes by HPC Representative"
                />
                {renderBarDistributionVisual(
                  progressNotesByRepresentativeDistribution,
                  "No progress notes are available by representative yet."
                )}
              </section>
            )}

            <section className="panel analytics-panel">
              <SectionHeader
                className="analytics-panel-header"
                kicker="Documents vs Assessments Uploaded"
              />
              {renderDonutChart(
                [
                  { label: "Documents", value: totalDocumentCount },
                  { label: "Assessments", value: totalAssessmentCount },
                ],
                "No document or assessment uploads are available yet.",
                "uploads",
                undefined,
                undefined,
                { className: "analytics-donut-legend-below" }
              )}
            </section>
          </div>
        </div>
      </section>

    </div>
  );
}
