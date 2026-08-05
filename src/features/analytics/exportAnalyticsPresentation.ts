import { save } from "@tauri-apps/plugin-dialog";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { writeFile } from "@tauri-apps/plugin-fs";
import type {
  AnalyticsActivityRecord,
  AnalyticsClient4PsInsight,
  AnalyticsClientRow,
  AnalyticsCssrsInsight,
} from "../../appShared";
import { APP_PRODUCT_NAME, CLINIC_NAME } from "../../appShared";

type DistributionItem = {
  label: string;
  value: number;
};

type GroupedDistributionItem = {
  label: string;
  primary: number;
  secondary: number;
};

type IntakeSeriesItem = {
  key: string;
  label: string;
  value: number;
};

type RecordActivityTrendItem = {
  key: string;
  label: string;
  progressNotes: number;
  documents: number;
  assessments: number;
};

type PresentationChartData = Array<{
  name: string;
  labels: string[];
  values: number[];
}>;

type PresentationSlide = {
  background?: { color: string };
  addShape: (shapeType: unknown, options: Record<string, unknown>) => void;
  addText: (text: string, options: Record<string, unknown>) => void;
  addChart: (
    chartType: unknown,
    data: PresentationChartData,
    options: Record<string, unknown>
  ) => void;
};

type PresentationDeck = {
  ChartType?: Record<string, unknown>;
  ShapeType?: Record<string, unknown>;
  layout: string;
  author: string;
  company: string;
  subject: string;
  title: string;
  addSlide: () => PresentationSlide;
  write: (options: { outputType: "arraybuffer" }) => Promise<ArrayBuffer> | ArrayBuffer;
};

type AnalyticsPresentationExportParams = {
  isAnalyticsExporting: boolean;
  setAnalyticsExportStatus: (value: string) => void;
  setIsAnalyticsExporting: (value: boolean) => void;
  analyticsClientRows: AnalyticsClientRow[];
  analyticsProgressNotes: AnalyticsActivityRecord[];
  analyticsDocuments: AnalyticsActivityRecord[];
  analyticsAssessments: AnalyticsActivityRecord[];
  analyticsCssrsRecords: AnalyticsCssrsInsight[];
  analyticsClient4PsRecords: AnalyticsClient4PsInsight[];
  analyticsFilterSummary: string;
  visibleIntakeSeries: IntakeSeriesItem[];
  ageDistribution: DistributionItem[];
  sexDistribution: DistributionItem[];
  sexualOrientationDistribution: DistributionItem[];
  maritalStatusDistribution: DistributionItem[];
  employmentStatusDistribution: DistributionItem[];
  representativeDistribution: DistributionItem[];
  narrativeCoverageGroupedByRepresentative: GroupedDistributionItem[];
  progressNotesByRepresentativeDistribution: DistributionItem[];
  statusDistribution: DistributionItem[];
  categoryDistribution: DistributionItem[];
  counsellingReasonDistribution: DistributionItem[];
  clientsWithSuicidalIdeation: AnalyticsClientRow[];
  clientsWithPreExistingDiagnosis: AnalyticsClientRow[];
  cssrsCompletedForIdeationCount: number;
  cssrsPendingForIdeationCount: number;
  elevatedCssrsCount: number;
  cssrsSeverityDistribution: DistributionItem[];
  cssrsBehaviorDistribution: DistributionItem[];
  mentalStatusDistribution: DistributionItem[];
  totalProgressNoteCount: number;
  totalDocumentCount: number;
  totalAssessmentCount: number;
  clientsWithProgressNotesCount: number;
  clientsWithoutProgressNotesCount: number;
  total4PsCompleteCount: number;
  total4PsNarrativeCount: number;
  recordActivityTrendSeries: RecordActivityTrendItem[];
  latestClientPoint: IntakeSeriesItem | null;
};

const formatAnalyticsPercentage = (value: number, total: number) => {
  if (total <= 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
};

const toChartItems = (items: DistributionItem[], emptyLabel: string) => {
  const visibleItems = items.filter((item) => item.value > 0);
  return visibleItems.length > 0 ? visibleItems : [{ label: emptyLabel, value: 0 }];
};

export async function exportAnalyticsPresentation({
  isAnalyticsExporting,
  setAnalyticsExportStatus,
  setIsAnalyticsExporting,
  analyticsClientRows,
  analyticsProgressNotes,
  analyticsDocuments,
  analyticsAssessments,
  analyticsCssrsRecords,
  analyticsClient4PsRecords,
  analyticsFilterSummary,
  visibleIntakeSeries,
  ageDistribution,
  sexDistribution,
  sexualOrientationDistribution,
  maritalStatusDistribution,
  employmentStatusDistribution,
  representativeDistribution,
  narrativeCoverageGroupedByRepresentative,
  progressNotesByRepresentativeDistribution,
  statusDistribution,
  categoryDistribution,
  counsellingReasonDistribution,
  clientsWithSuicidalIdeation,
  clientsWithPreExistingDiagnosis,
  cssrsCompletedForIdeationCount,
  cssrsPendingForIdeationCount,
  elevatedCssrsCount,
  cssrsSeverityDistribution,
  cssrsBehaviorDistribution,
  mentalStatusDistribution,
  totalProgressNoteCount,
  totalDocumentCount,
  totalAssessmentCount,
  clientsWithProgressNotesCount,
  clientsWithoutProgressNotesCount,
  total4PsCompleteCount,
  total4PsNarrativeCount,
  recordActivityTrendSeries,
  latestClientPoint,
}: AnalyticsPresentationExportParams) {
  if (isAnalyticsExporting) return;

  setAnalyticsExportStatus(feedbackMessages.loading("Preparing presentation deck"));
  setIsAnalyticsExporting(true);

  try {
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS() as PresentationDeck;
    const chartType = pptx.ChartType ?? {};
    const shapeType = pptx.ShapeType ?? {};

    const palette = {
      background: "FFF8F3",
      surface: "FFFFFF",
      text: "30121A",
      muted: "86564D",
      border: "F5BE9A",
      primary: "C85B3B",
      primarySoft: "FFF1E9",
      secondary: "4C956C",
      accent: "F9734D",
      warning: "F0A94B",
      danger: "E5232B",
      quiet: "F8EFEA",
    };

    pptx.layout = "LAYOUT_WIDE";
    pptx.author = APP_PRODUCT_NAME;
    pptx.company = CLINIC_NAME;
    pptx.subject = "Clinic Analytics Report";
    pptx.title = "Clinic Analytics Report";

    const validAnalyticsDates = [
      ...analyticsClientRows.flatMap((client) => [
        client.intake_date,
        client.created_at,
        client.updated_at,
      ]),
      ...analyticsProgressNotes.map((item) => item.created_at),
      ...analyticsDocuments.map((item) => item.created_at),
      ...analyticsAssessments.map((item) => item.created_at),
      ...analyticsCssrsRecords.map((item) => item.updated_at),
      ...analyticsClient4PsRecords.map((item) => item.updated_at),
    ]
      .map((value) => {
        if (!value) return null;
        const candidate = new Date(value);
        return Number.isNaN(candidate.getTime()) ? null : candidate;
      })
      .filter((value): value is Date => value instanceof Date)
      .sort((left, right) => left.getTime() - right.getTime());

    const formatPresentationDate = (value: Date) =>
      value.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

    const reportingRangeLabel =
      validAnalyticsDates.length > 0
        ? `${formatPresentationDate(validAnalyticsDates[0])} – ${formatPresentationDate(
            validAnalyticsDates[validAnalyticsDates.length - 1]
          )}`
        : "Current available records";

    const generatedDateLabel = formatPresentationDate(new Date());
    const fileDateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `hpc-clinic-analytics-report-${fileDateStamp}.pptx`;

    const activeClientCount =
      statusDistribution.find((item) => item.label === "Active")?.value ?? 0;
    const terminatedClientCount =
      statusDistribution.find((item) => item.label === "Terminated")?.value ?? 0;
    const cssrsCompletionShare = formatAnalyticsPercentage(
      cssrsCompletedForIdeationCount,
      clientsWithSuicidalIdeation.length
    );
    const narrativeMissingAfterCompleteCount = Math.max(
      total4PsCompleteCount - total4PsNarrativeCount,
      0
    );

    const addSlideFrame = (slide: PresentationSlide, slideNumber: number) => {
      slide.background = { color: palette.background };
      slide.addShape(shapeType.line ?? "line", {
        x: 0.55,
        y: 6.8,
        w: 12.2,
        h: 0,
        line: { color: palette.border, pt: 1 },
      });
      slide.addText("Aggregated clinic analytics only", {
        x: 0.75,
        y: 7.02,
        w: 5,
        h: 0.24,
        fontFace: "Aptos",
        fontSize: 10,
        color: palette.muted,
        italic: true,
        margin: 0,
      });
      slide.addText(String(slideNumber), {
        x: 12.35,
        y: 6.98,
        w: 0.4,
        h: 0.28,
        fontFace: "Aptos",
        fontSize: 16,
        bold: true,
        color: palette.primary,
        align: "right",
        margin: 0,
      });
    };

    const addSlideHeading = (slide: PresentationSlide, title: string, subtitle: string) => {
      slide.addText(title, {
        x: 0.75,
        y: 0.42,
        w: 9.5,
        h: 0.45,
        fontFace: "Aptos Display",
        fontSize: 25,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addText(subtitle, {
        x: 0.77,
        y: 0.96,
        w: 10.5,
        h: 0.28,
        fontFace: "Aptos",
        fontSize: 12,
        color: palette.muted,
        margin: 0,
      });
    };

    const addCard = (
      slide: PresentationSlide,
      x: number,
      y: number,
      w: number,
      h: number,
      {
        title,
        value,
        body,
        accentColor = palette.primary,
        fillColor = palette.surface,
        valueFontSize = 22,
      }: {
        title: string;
        value?: string | number;
        body?: string;
        accentColor?: string;
        fillColor?: string;
        valueFontSize?: number;
      }
    ) => {
      slide.addShape(shapeType.roundRect ?? "roundRect", {
        x,
        y,
        w,
        h,
        rectRadius: 0.12,
        fill: { color: fillColor },
        line: { color: palette.border, pt: 1 },
      });
      slide.addShape(shapeType.rect ?? "rect", {
        x,
        y,
        w: 0.08,
        h,
        fill: { color: accentColor },
        line: { color: accentColor, transparency: 100 },
      });
      slide.addText(title, {
        x: x + 0.18,
        y: y + 0.16,
        w: w - 0.34,
        h: 0.24,
        fontFace: "Aptos",
        fontSize: 10,
        bold: true,
        color: palette.muted,
        margin: 0,
      });
      if (value !== undefined) {
        slide.addText(String(value), {
          x: x + 0.18,
          y: y + 0.47,
          w: w - 0.34,
          h: 0.36,
          fontFace: "Aptos Display",
          fontSize: valueFontSize,
          bold: true,
          color: accentColor,
          margin: 0,
          fit: "shrink",
        });
      }
      if (body) {
        slide.addText(body, {
          x: x + 0.18,
          y: value !== undefined ? y + 0.9 : y + 0.45,
          w: w - 0.34,
          h: Math.max(0.25, h - (value !== undefined ? 1.0 : 0.55)),
          fontFace: "Aptos",
          fontSize: 9.2,
          color: palette.text,
          margin: 0,
          valign: "top",
          fit: "shrink",
        });
      }
    };

    const addBarChart = (
      slide: PresentationSlide,
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      items: DistributionItem[],
      color = palette.primary
    ) => {
      const visibleItems = toChartItems(items, "No data").slice(0, 8);
      slide.addText(title, {
        x,
        y,
        w,
        h: 0.25,
        fontFace: "Aptos",
        fontSize: 12,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addChart(
        chartType.bar ?? "bar",
        [
          {
            name: title,
            labels: visibleItems.map((item) => item.label),
            values: visibleItems.map((item) => item.value),
          },
        ],
        {
          x,
          y: y + 0.35,
          w,
          h: h - 0.35,
          showLegend: false,
          showValue: true,
          showCategoryName: true,
          catAxisLabelFontFace: "Aptos",
          catAxisLabelFontSize: 8,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 8,
          chartColors: [color],
          gapWidthPct: 45,
        }
      );
    };


    const addGroupedBarChart = (
      slide: PresentationSlide,
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      items: GroupedDistributionItem[],
      primaryLabel: string,
      secondaryLabel: string
    ) => {
      const visibleItems = items.filter((item) => item.primary > 0 || item.secondary > 0).slice(0, 8);
      const labels = visibleItems.length > 0 ? visibleItems.map((item) => item.label) : ["No data"];
      slide.addText(title, {
        x,
        y,
        w,
        h: 0.25,
        fontFace: "Aptos",
        fontSize: 12,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addChart(
        chartType.bar ?? "bar",
        [
          {
            name: primaryLabel,
            labels,
            values: visibleItems.length > 0 ? visibleItems.map((item) => item.primary) : [0],
          },
          {
            name: secondaryLabel,
            labels,
            values: visibleItems.length > 0 ? visibleItems.map((item) => item.secondary) : [0],
          },
        ],
        {
          x,
          y: y + 0.35,
          w,
          h: h - 0.35,
          showLegend: true,
          showValue: true,
          showCategoryName: true,
          catAxisLabelFontFace: "Aptos",
          catAxisLabelFontSize: 8,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 8,
          chartColors: [palette.primary, palette.secondary],
          gapWidthPct: 50,
        }
      );
    };

    const addLineChart = (
      slide: PresentationSlide,
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      items: DistributionItem[],
      color = palette.primary
    ) => {
      const visibleItems = toChartItems(items, "No data");
      slide.addText(title, {
        x,
        y,
        w,
        h: 0.25,
        fontFace: "Aptos",
        fontSize: 12,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addChart(
        chartType.line ?? "line",
        [
          {
            name: title,
            labels: visibleItems.map((item) => item.label),
            values: visibleItems.map((item) => item.value),
          },
        ],
        {
          x,
          y: y + 0.35,
          w,
          h: h - 0.35,
          showLegend: false,
          showValue: false,
          catAxisLabelFontFace: "Aptos",
          catAxisLabelFontSize: 8,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 8,
          chartColors: [color],
          lineSize: 3,
        }
      );
    };

    const addStackedColumnChart = (
      slide: PresentationSlide,
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      items: RecordActivityTrendItem[]
    ) => {
      const visibleItems = items.filter((item) => item.documents > 0 || item.assessments > 0);
      const labels = visibleItems.length > 0 ? visibleItems.map((item) => item.label) : ["No data"];
      slide.addText(title, {
        x,
        y,
        w,
        h: 0.25,
        fontFace: "Aptos",
        fontSize: 12,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addChart(
        chartType.bar ?? "bar",
        [
          {
            name: "Documents",
            labels,
            values: visibleItems.length > 0 ? visibleItems.map((item) => item.documents) : [0],
          },
          {
            name: "Assessments",
            labels,
            values: visibleItems.length > 0 ? visibleItems.map((item) => item.assessments) : [0],
          },
        ],
        {
          x,
          y: y + 0.35,
          w,
          h: h - 0.35,
          showLegend: true,
          showValue: true,
          catAxisLabelFontFace: "Aptos",
          catAxisLabelFontSize: 8,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 8,
          chartColors: [palette.primary, palette.warning],
          grouping: "stacked",
          gapWidthPct: 45,
        }
      );
    };

    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.background };
    titleSlide.addText("Clinic Analytics Report", {
      x: 0.75,
      y: 0.72,
      w: 8.5,
      h: 0.5,
      fontFace: "Aptos Display",
      fontSize: 32,
      bold: true,
      color: palette.text,
      margin: 0,
    });
    titleSlide.addText(`${CLINIC_NAME} • ${APP_PRODUCT_NAME}`, {
      x: 0.78,
      y: 1.33,
      w: 8.4,
      h: 0.28,
      fontFace: "Aptos",
      fontSize: 14,
      color: palette.muted,
      margin: 0,
    });
    titleSlide.addText(`Reporting Period: ${reportingRangeLabel}`, {
      x: 0.78,
      y: 1.82,
      w: 7.4,
      h: 0.25,
      fontFace: "Aptos",
      fontSize: 12,
      bold: true,
      color: palette.text,
      margin: 0,
    });
    titleSlide.addText(`Generated: ${generatedDateLabel}`, {
      x: 0.78,
      y: 2.17,
      w: 4.6,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 11,
      color: palette.muted,
      margin: 0,
    });
    titleSlide.addText(`Filters: ${analyticsFilterSummary}`, {
      x: 0.78,
      y: 2.48,
      w: 6.6,
      h: 0.45,
      fontFace: "Aptos",
      fontSize: 10,
      color: palette.muted,
      margin: 0,
      valign: "top",
    });

    addCard(titleSlide, 7.7, 0.9, 2.25, 1.35, {
      title: "Total Clients",
      value: analyticsClientRows.length.toLocaleString(),
      body: latestClientPoint
        ? `Latest intake period: ${latestClientPoint.label}`
        : "No intake records yet",
    });
    addCard(titleSlide, 10.2, 0.9, 2.25, 1.35, {
      title: "C-SSRS Needed",
      value: clientsWithSuicidalIdeation.length.toLocaleString(),
      body: `${cssrsCompletionShare} complete`,
      accentColor: palette.danger,
    });
    addCard(titleSlide, 7.7, 2.55, 2.25, 1.35, {
      title: "4Ps Complete",
      value: total4PsCompleteCount.toLocaleString(),
      body: `${total4PsNarrativeCount.toLocaleString()} narrative reports`,
      accentColor: palette.accent,
    });
    addCard(titleSlide, 10.2, 2.55, 2.25, 1.35, {
      title: "Progress Notes",
      value: totalProgressNoteCount.toLocaleString(),
      body: `${clientsWithProgressNotesCount} clients with notes`,
      accentColor: palette.secondary,
    });
    addCard(titleSlide, 0.75, 4.85, 11.7, 1.1, {
      title: "Report sections",
      body:
        "Summary metrics • Client population • Demographics • Presenting concerns • C-SSRS risk • 4Ps / Narrative Report • Records activity",
      fillColor: palette.primarySoft,
      valueFontSize: 16,
    });

    const summarySlide = pptx.addSlide();
    addSlideFrame(summarySlide, 2);
    addSlideHeading(
      summarySlide,
      "1. Summary Metrics",
      "High-level workload and clinical documentation indicators."
    );
    const summaryCards = [
      ["Total Clients", analyticsClientRows.length.toLocaleString(), `${analyticsClientRows.length} filtered records`],
      ["Active Clients", activeClientCount.toLocaleString(), `${terminatedClientCount} terminated`],
      ["Terminated Clients", terminatedClientCount.toLocaleString(), `${formatAnalyticsPercentage(terminatedClientCount, analyticsClientRows.length)} of filtered clients`],
      ["C-SSRS Needed", clientsWithSuicidalIdeation.length.toLocaleString(), `${cssrsCompletedForIdeationCount} completed`],
      ["4Ps Complete", total4PsCompleteCount.toLocaleString(), `${total4PsNarrativeCount} narrative reports`],
      ["Progress Notes", totalProgressNoteCount.toLocaleString(), `${clientsWithProgressNotesCount} clients with notes`],
    ] as const;
    summaryCards.forEach(([title, value, body], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      addCard(summarySlide, 0.75 + col * 4.05, 1.5 + row * 1.75, 3.65, 1.28, {
        title,
        value,
        body,
        accentColor: index === 3 ? palette.danger : index === 4 ? palette.accent : palette.primary,
      });
    });

    const populationSlide = pptx.addSlide();
    addSlideFrame(populationSlide, 3);
    addSlideHeading(
      populationSlide,
      "2. Client Population",
      "Intake trend, status, categories, and HPC representative assignments."
    );
    addLineChart(
      populationSlide,
      0.75,
      1.45,
      5.75,
      2.45,
      "Clients over time",
      visibleIntakeSeries.map((item) => ({ label: item.label, value: item.value })),
      palette.primary
    );
    addBarChart(populationSlide, 6.9, 1.45, 2.55, 2.45, "Active vs Terminated", statusDistribution, palette.accent);
    addBarChart(populationSlide, 9.8, 1.45, 2.55, 2.45, "Clients by Category", categoryDistribution, palette.warning);
    addBarChart(
      populationSlide,
      0.75,
      4.15,
      11.55,
      1.9,
      "Clients by HPC Representative",
      representativeDistribution,
      palette.secondary
    );

    const demographicsSlide = pptx.addSlide();
    addSlideFrame(demographicsSlide, 4);
    addSlideHeading(
      demographicsSlide,
      "3. Demographics",
      "Client profile based on structured intake fields."
    );
    addBarChart(demographicsSlide, 0.75, 1.4, 3.8, 2.35, "Age Groups", ageDistribution, palette.primary);
    addBarChart(demographicsSlide, 4.9, 1.4, 3.45, 2.35, "Sex", sexDistribution, palette.accent);
    addBarChart(demographicsSlide, 8.7, 1.4, 3.6, 2.35, "Sexual Orientation", sexualOrientationDistribution, palette.secondary);
    addBarChart(demographicsSlide, 0.75, 4.05, 5.55, 2.1, "Marital Status", maritalStatusDistribution, palette.warning);
    addBarChart(demographicsSlide, 6.75, 4.05, 5.55, 2.1, "Employment Status", employmentStatusDistribution, palette.primary);

    const concernsSlide = pptx.addSlide();
    addSlideFrame(concernsSlide, 5);
    addSlideHeading(
      concernsSlide,
      "4. Presenting Concerns",
      "Counseling reason frequency and concern patterns across the selected client view."
    );
    addBarChart(
      concernsSlide,
      0.75,
      1.45,
      11.55,
      2.75,
      "Top counseling reasons",
      counsellingReasonDistribution.slice(0, 10),
      palette.primary
    );
    addCard(concernsSlide, 0.75, 4.65, 5.55, 1.15, {
      title: "Suicidal Ideation",
      value: clientsWithSuicidalIdeation.length.toLocaleString(),
      body: "SI selected",
      accentColor: palette.danger,
    });
    addCard(concernsSlide, 6.75, 4.65, 5.55, 1.15, {
      title: "Psychiatric Diagnosis",
      value: clientsWithPreExistingDiagnosis.length.toLocaleString(),
      body: "Diagnosis indicated",
      accentColor: palette.warning,
    });

    const riskSlide = pptx.addSlide();
    addSlideFrame(riskSlide, 6);
    addSlideHeading(
      riskSlide,
      "5. C-SSRS Risk",
      "Completion, severity, behavior, and mental-status patterns among ideation-flagged clients."
    );
    addCard(riskSlide, 0.75, 1.35, 3.65, 1.08, {
      title: "Ideation-flagged",
      value: clientsWithSuicidalIdeation.length.toLocaleString(),
      body: "C-SSRS applies to these clients",
      accentColor: palette.danger,
    });
    addCard(riskSlide, 4.85, 1.35, 3.65, 1.08, {
      title: "C-SSRS completion",
      value: cssrsCompletionShare,
      body: `${cssrsCompletedForIdeationCount} completed / ${clientsWithSuicidalIdeation.length} needed • ${cssrsPendingForIdeationCount} pending`,
      accentColor: palette.secondary,
    });
    addCard(riskSlide, 8.95, 1.35, 3.35, 1.08, {
      title: "Elevated C-SSRS",
      value: elevatedCssrsCount.toLocaleString(),
      body: "Severity 4–5 or recent behavior",
      accentColor: palette.danger,
    });
    addBarChart(riskSlide, 0.75, 2.85, 3.7, 3.3, "Severity", cssrsSeverityDistribution, palette.danger);
    addBarChart(riskSlide, 4.85, 2.85, 3.55, 3.3, "Behavior", cssrsBehaviorDistribution, palette.warning);
    addBarChart(riskSlide, 8.75, 2.85, 3.55, 3.3, "Mental Status", mentalStatusDistribution, palette.primary);

    const fourPsSlide = pptx.addSlide();
    addSlideFrame(fourPsSlide, 7);
    addSlideHeading(
      fourPsSlide,
      "6. 4Ps / Narrative Report",
      "Case conceptualization completion and narrative report coverage."
    );
    addCard(fourPsSlide, 0.75, 1.55, 5.65, 1.3, {
      title: "4Ps Complete",
      value: total4PsCompleteCount.toLocaleString(),
      body: "One or more entries in every 4Ps row",
      accentColor: palette.accent,
    });
    addCard(fourPsSlide, 6.85, 1.55, 5.65, 1.3, {
      title: "Narrative Reports",
      value: total4PsNarrativeCount.toLocaleString(),
      body: `${narrativeMissingAfterCompleteCount} complete 4Ps without narrative`,
      accentColor: palette.secondary,
    });
    addGroupedBarChart(
      fourPsSlide,
      0.75,
      3.35,
      11.55,
      2.75,
      "Narrative Report Coverage by HPC Representative",
      narrativeCoverageGroupedByRepresentative,
      "4Ps Complete",
      "Narrative Reports"
    );

    const recordsSlide = pptx.addSlide();
    addSlideFrame(recordsSlide, 8);
    addSlideHeading(
      recordsSlide,
      "7. Records Activity",
      "Progress notes, file records, and documentation trends."
    );
    addCard(recordsSlide, 0.75, 1.35, 2.65, 1.08, {
      title: "Progress Notes",
      value: totalProgressNoteCount.toLocaleString(),
      body: `${clientsWithProgressNotesCount} clients with notes`,
      accentColor: palette.primary,
    });
    addCard(recordsSlide, 3.62, 1.35, 2.65, 1.08, {
      title: "Documents",
      value: totalDocumentCount.toLocaleString(),
      body: "Uploaded document records",
      accentColor: palette.secondary,
    });
    addCard(recordsSlide, 6.49, 1.35, 2.65, 1.08, {
      title: "Assessments",
      value: totalAssessmentCount.toLocaleString(),
      body: "Uploaded assessment records",
      accentColor: palette.warning,
    });
    addCard(recordsSlide, 9.36, 1.35, 2.65, 1.08, {
      title: "Clients without Notes",
      value: clientsWithoutProgressNotesCount.toLocaleString(),
      body: "No progress notes recorded yet",
      accentColor: palette.danger,
    });
    addLineChart(
      recordsSlide,
      0.75,
      2.85,
      3.6,
      3.25,
      "Progress Notes Over Time",
      recordActivityTrendSeries.map((item) => ({ label: item.label, value: item.progressNotes })),
      palette.primary
    );
    addBarChart(
      recordsSlide,
      4.65,
      2.85,
      3.6,
      3.25,
      "Progress Notes by HPC Representative",
      progressNotesByRepresentativeDistribution,
      palette.secondary
    );
    addStackedColumnChart(
      recordsSlide,
      8.55,
      2.85,
      3.6,
      3.25,
      "Documents vs Assessments",
      recordActivityTrendSeries
    );

    const selectedSavePath = await save({
      title: "Save analytics presentation",
      defaultPath: fileName,
      filters: [{ name: "PowerPoint Presentation", extensions: ["pptx"] }],
    });

    if (!selectedSavePath) {
      setAnalyticsExportStatus(feedbackMessages.cancelled("presentation export"));
      return;
    }

    const finalSavePath =
      selectedSavePath.toLowerCase().endsWith(".pptx")
        ? selectedSavePath
        : `${selectedSavePath}.pptx`;

    const output = await pptx.write({ outputType: "arraybuffer" });
    await writeFile(finalSavePath, new Uint8Array(output));

    setAnalyticsExportStatus(`Presentation saved to ${finalSavePath}.`);
  } catch (error) {
    const message = getErrorDetail(error, "Unknown presentation export error");
    setAnalyticsExportStatus(feedbackMessages.error("We could not create the presentation.", message));
  } finally {
    setIsAnalyticsExporting(false);
  }
}
