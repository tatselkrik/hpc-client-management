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
  addImage: (options: Record<string, unknown>) => void;
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

const loadPresentationImage = async (assetPath: string) => {
  const assetUrl =
    typeof window === "undefined"
      ? assetPath
      : new URL(assetPath, window.location.href).toString();
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Brand asset could not be loaded (${response.status}).`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }

  const mediaType = response.headers.get("content-type") || "image/png";
  return `data:${mediaType};base64,${btoa(binary)}`;
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
    const [clinicLogoData, clinicIconData] = await Promise.all([
      loadPresentationImage("/hpc-logo.svg"),
      loadPresentationImage("/hpc-icon.svg"),
    ]);

    const palette = {
      background: "FBF8F5",
      surface: "FFFFFF",
      text: "172033",
      muted: "687386",
      border: "E8DED6",
      primary: "E46F4C",
      primaryDark: "9E3F2D",
      primarySoft: "FFF0E9",
      secondary: "347663",
      accent: "C9553A",
      warning: "C9872C",
      danger: "C93F49",
      quiet: "F4EEE9",
      navy: "172033",
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
      slide.addShape(shapeType.rect ?? "rect", {
        x: 0,
        y: 0,
        w: 0.16,
        h: 7.5,
        fill: { color: palette.primary },
        line: { color: palette.primary, transparency: 100 },
      });
      slide.addShape(shapeType.line ?? "line", {
        x: 0.65,
        y: 6.92,
        w: 12,
        h: 0,
        line: { color: palette.border, pt: 1 },
      });
      slide.addText("Aggregated clinic analytics only", {
        x: 0.72,
        y: 7.04,
        w: 5,
        h: 0.24,
        fontFace: "Aptos",
        fontSize: 9.5,
        color: palette.muted,
        italic: true,
        margin: 0,
      });
      slide.addText(String(slideNumber), {
        x: 12.1,
        y: 7.0,
        w: 0.4,
        h: 0.28,
        fontFace: "Aptos",
        fontSize: 13,
        bold: true,
        color: palette.primary,
        align: "right",
        margin: 0,
      });
    };

    const addSlideBrandMark = (slide: PresentationSlide) => {
      slide.addImage({
        data: clinicIconData,
        x: 11.78,
        y: 0.3,
        w: 0.58,
        h: 0.58,
      });
    };

    const addSlideHeading = (slide: PresentationSlide, title: string, subtitle: string) => {
      slide.addText(title, {
        x: 0.75,
        y: 0.38,
        w: 10.4,
        h: 0.58,
        fontFace: "Aptos Display",
        fontSize: 35,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      slide.addText(subtitle, {
        x: 0.77,
        y: 1.0,
        w: 11.2,
        h: 0.32,
        fontFace: "Aptos",
        fontSize: 14,
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
        valueFontSize = 25,
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
        line: { color: palette.border, pt: 1.2 },
        shadow: { type: "outer", color: "B7A89F", opacity: 0.14, blur: 1.5, angle: 45, distance: 1 },
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
        x: x + 0.22,
        y: y + 0.18,
        w: w - 0.34,
        h: 0.24,
        fontFace: "Aptos",
        fontSize: 11.5,
        bold: true,
        color: palette.muted,
        margin: 0,
      });
      if (value !== undefined) {
        slide.addText(String(value), {
          x: x + 0.22,
          y: y + 0.46,
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
          x: x + 0.22,
          y: value !== undefined ? y + 0.84 : y + 0.48,
          w: w - 0.34,
          h: Math.max(0.18, h - (value !== undefined ? 0.9 : 0.55)),
          fontFace: "Aptos",
          fontSize: 10.5,
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
        fontSize: 14,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      if (!items.some((item) => item.value > 0)) {
        slide.addShape(shapeType.roundRect ?? "roundRect", {
          x,
          y: y + 0.42,
          w,
          h: h - 0.42,
          rectRadius: 0.12,
          fill: { color: palette.quiet },
          line: { color: palette.border, pt: 1 },
        });
        slide.addText("No records in the selected view", {
          x: x + 0.25,
          y: y + h / 2 - 0.12,
          w: w - 0.5,
          h: 0.3,
          fontFace: "Aptos",
          fontSize: 14,
          bold: true,
          color: palette.muted,
          align: "center",
          margin: 0,
        });
        return;
      }
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
          catAxisLabelFontSize: 10,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 9,
          chartColors: [color],
          gapWidthPct: 45,
          showTitle: false,
          showCatName: false,
          showValAxisTitle: false,
          showCatAxisTitle: false,
          showBorder: false,
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
        fontSize: 14,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      if (visibleItems.length === 0) {
        slide.addShape(shapeType.roundRect ?? "roundRect", {
          x,
          y: y + 0.42,
          w,
          h: h - 0.42,
          fill: { color: palette.quiet },
          line: { color: palette.border, pt: 1 },
        });
        slide.addText("No coverage records in the selected view", {
          x: x + 0.25,
          y: y + h / 2 - 0.12,
          w: w - 0.5,
          h: 0.3,
          fontFace: "Aptos",
          fontSize: 14,
          bold: true,
          color: palette.muted,
          align: "center",
          margin: 0,
        });
        return;
      }
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
          catAxisLabelFontSize: 10,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 9,
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
        fontSize: 14,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      if (!items.some((item) => item.value > 0)) {
        slide.addShape(shapeType.roundRect ?? "roundRect", {
          x,
          y: y + 0.42,
          w,
          h: h - 0.42,
          fill: { color: palette.quiet },
          line: { color: palette.border, pt: 1 },
        });
        slide.addText("No trend records in the selected view", {
          x: x + 0.25,
          y: y + h / 2 - 0.12,
          w: w - 0.5,
          h: 0.3,
          fontFace: "Aptos",
          fontSize: 14,
          bold: true,
          color: palette.muted,
          align: "center",
          margin: 0,
        });
        return;
      }
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
          catAxisLabelFontSize: 10,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 9,
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
        fontSize: 14,
        bold: true,
        color: palette.text,
        margin: 0,
      });
      if (visibleItems.length === 0) {
        slide.addShape(shapeType.roundRect ?? "roundRect", {
          x,
          y: y + 0.42,
          w,
          h: h - 0.42,
          fill: { color: palette.quiet },
          line: { color: palette.border, pt: 1 },
        });
        slide.addText("No file activity in the selected view", {
          x: x + 0.25,
          y: y + h / 2 - 0.12,
          w: w - 0.5,
          h: 0.3,
          fontFace: "Aptos",
          fontSize: 14,
          bold: true,
          color: palette.muted,
          align: "center",
          margin: 0,
        });
        return;
      }
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
          catAxisLabelFontSize: 10,
          valAxisLabelFontFace: "Aptos",
          valAxisLabelFontSize: 9,
          chartColors: [palette.primary, palette.warning],
          grouping: "stacked",
          gapWidthPct: 45,
        }
      );
    };

    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.navy };
    titleSlide.addShape(shapeType.rect ?? "rect", {
      x: 0,
      y: 0,
      w: 0.18,
      h: 7.5,
      fill: { color: palette.primary },
      line: { color: palette.primary, transparency: 100 },
    });
    titleSlide.addShape(shapeType.roundRect ?? "roundRect", {
      x: 0.8,
      y: 0.46,
      w: 5.45,
      h: 1.46,
      rectRadius: 0.12,
      fill: { color: palette.background },
      line: { color: "3A4963", pt: 1 },
    });
    titleSlide.addImage({
      data: clinicLogoData,
      x: 1.02,
      y: 0.54,
      w: 5,
      h: 1.41,
    });
    titleSlide.addText("Clinic Analytics Report", {
      x: 0.8,
      y: 2.18,
      w: 6.25,
      h: 1.2,
      fontFace: "Aptos Display",
      fontSize: 50,
      bold: true,
      color: "FFFFFF",
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
    titleSlide.addText("A clear view of caseload, clinical follow-up, and documentation activity.", {
      x: 0.83,
      y: 3.47,
      w: 5.9,
      h: 0.64,
      fontFace: "Aptos",
      fontSize: 19,
      color: "D7DDE8",
      margin: 0,
      valign: "mid",
    });
    titleSlide.addShape(shapeType.roundRect ?? "roundRect", {
      x: 0.8,
      y: 4.55,
      w: 5.9,
      h: 1.48,
      rectRadius: 0.12,
      fill: { color: "223049", transparency: 0 },
      line: { color: "3A4963", pt: 1 },
    });
    titleSlide.addText("REPORTING WINDOW", {
      x: 1.06,
      y: 4.83,
      w: 2.2,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 11,
      bold: true,
      color: "F3B49F",
      charSpacing: 1.2,
      margin: 0,
    });
    titleSlide.addText(reportingRangeLabel, {
      x: 1.06,
      y: 5.18,
      w: 5.2,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 17,
      bold: true,
      color: "FFFFFF",
      margin: 0,
    });
    titleSlide.addText(`Generated ${generatedDateLabel}  •  ${analyticsFilterSummary}`, {
      x: 1.06,
      y: 5.6,
      w: 5.2,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 10.5,
      color: "BCC6D6",
      margin: 0,
      fit: "shrink",
    });

    addCard(titleSlide, 7.3, 0.72, 2.45, 1.55, {
      title: "Total Clients",
      value: analyticsClientRows.length.toLocaleString(),
      body: latestClientPoint
        ? `Latest intake period: ${latestClientPoint.label}`
        : "No intake records yet",
    });
    addCard(titleSlide, 10.05, 0.72, 2.45, 1.55, {
      title: "C-SSRS Needed",
      value: clientsWithSuicidalIdeation.length.toLocaleString(),
      body: `${cssrsCompletionShare} complete`,
      accentColor: palette.danger,
    });
    addCard(titleSlide, 7.3, 2.55, 2.45, 1.55, {
      title: "4Ps Complete",
      value: total4PsCompleteCount.toLocaleString(),
      body: `${total4PsNarrativeCount.toLocaleString()} narrative reports`,
      accentColor: palette.accent,
    });
    addCard(titleSlide, 10.05, 2.55, 2.45, 1.55, {
      title: "Progress Notes",
      value: totalProgressNoteCount.toLocaleString(),
      body: `${clientsWithProgressNotesCount} clients with notes`,
      accentColor: palette.secondary,
    });
    addCard(titleSlide, 7.3, 4.38, 5.2, 1.42, {
      title: "Inside this report",
      body:
        "Caseload summary  •  Client population  •  Demographics  •  Presenting concerns  •  C-SSRS risk  •  4Ps coverage  •  Records activity",
      fillColor: palette.primarySoft,
      valueFontSize: 16,
    });
    titleSlide.addText(`${CLINIC_NAME}  •  ${APP_PRODUCT_NAME}`, {
      x: 0.82,
      y: 6.83,
      w: 7.2,
      h: 0.25,
      fontFace: "Aptos",
      fontSize: 10.5,
      color: "9EABC0",
      margin: 0,
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
      addCard(summarySlide, 0.75 + col * 4.05, 1.55 + row * 1.9, 3.65, 1.52, {
        title,
        value,
        body,
        accentColor: index === 3 ? palette.danger : index === 4 ? palette.accent : palette.primary,
      });
    });
    addCard(summarySlide, 0.75, 5.55, 11.75, 0.78, {
      title: "Quick read",
      body: `${formatAnalyticsPercentage(activeClientCount, analyticsClientRows.length)} of filtered clients are active. ${cssrsPendingForIdeationCount} C-SSRS screening${cssrsPendingForIdeationCount === 1 ? " is" : "s are"} pending. ${formatAnalyticsPercentage(clientsWithProgressNotesCount, analyticsClientRows.length)} of clients have progress notes.`,
      fillColor: palette.primarySoft,
      accentColor: palette.primary,
    });
    addSlideBrandMark(summarySlide);

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
    addSlideBrandMark(populationSlide);

    const demographicsSlide = pptx.addSlide();
    addSlideFrame(demographicsSlide, 4);
    addSlideHeading(
      demographicsSlide,
      "3. Demographic Profile",
      "Core demographic distributions from structured intake fields."
    );
    addBarChart(demographicsSlide, 0.75, 1.55, 3.75, 4.65, "Age Groups", ageDistribution, palette.primary);
    addBarChart(demographicsSlide, 4.8, 1.55, 3.45, 4.65, "Sex", sexDistribution, palette.accent);
    addBarChart(demographicsSlide, 8.55, 1.55, 3.75, 4.65, "Sexual Orientation", sexualOrientationDistribution, palette.secondary);
    addSlideBrandMark(demographicsSlide);

    const lifeContextSlide = pptx.addSlide();
    addSlideFrame(lifeContextSlide, 5);
    addSlideHeading(
      lifeContextSlide,
      "4. Life Context",
      "Marital and employment status provide context for service planning."
    );
    addBarChart(lifeContextSlide, 0.75, 1.55, 5.7, 4.55, "Marital Status", maritalStatusDistribution, palette.warning);
    addBarChart(lifeContextSlide, 6.75, 1.55, 5.55, 4.55, "Employment Status", employmentStatusDistribution, palette.primary);
    addSlideBrandMark(lifeContextSlide);

    const concernsSlide = pptx.addSlide();
    addSlideFrame(concernsSlide, 6);
    addSlideHeading(
      concernsSlide,
      "5. Presenting Concerns",
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
    addSlideBrandMark(concernsSlide);

    const riskSlide = pptx.addSlide();
    addSlideFrame(riskSlide, 7);
    addSlideHeading(
      riskSlide,
      "6. C-SSRS Risk",
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
    addSlideBrandMark(riskSlide);

    const fourPsSlide = pptx.addSlide();
    addSlideFrame(fourPsSlide, 8);
    addSlideHeading(
      fourPsSlide,
      "7. 4Ps / Narrative Report",
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
    addSlideBrandMark(fourPsSlide);

    const recordsSlide = pptx.addSlide();
    addSlideFrame(recordsSlide, 9);
    addSlideHeading(
      recordsSlide,
      "8. Records Activity",
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
    addSlideBrandMark(recordsSlide);

    const takeawayItems = [
      {
        value: `${activeClientCount}/${analyticsClientRows.length}`,
        label: "Active caseload",
        detail:
          analyticsClientRows.length > 0
            ? `${formatAnalyticsPercentage(activeClientCount, analyticsClientRows.length)} of clients in the selected view are active.`
            : "No clients are included in the selected view.",
        color: palette.primary,
      },
      {
        value:
          clientsWithSuicidalIdeation.length > 0
            ? `${cssrsCompletedForIdeationCount}/${clientsWithSuicidalIdeation.length}`
            : "0",
        label: "C-SSRS completion",
        detail:
          clientsWithSuicidalIdeation.length > 0
            ? `${cssrsPendingForIdeationCount} screening${cssrsPendingForIdeationCount === 1 ? " remains" : "s remain"} pending.`
            : "No ideation-flagged clients are included in this view.",
        color: palette.danger,
      },
      {
        value: formatAnalyticsPercentage(
          clientsWithProgressNotesCount,
          analyticsClientRows.length
        ),
        label: "Progress-note coverage",
        detail: `${clientsWithoutProgressNotesCount} client${clientsWithoutProgressNotesCount === 1 ? " has" : "s have"} no progress note recorded.`,
        color: palette.secondary,
      },
      {
        value:
          total4PsCompleteCount > 0
            ? `${total4PsNarrativeCount}/${total4PsCompleteCount}`
            : "0",
        label: "4Ps narrative coverage",
        detail:
          total4PsCompleteCount > 0
            ? `${narrativeMissingAfterCompleteCount} completed 4Ps record${narrativeMissingAfterCompleteCount === 1 ? " is" : "s are"} without a narrative.`
            : "No completed 4Ps records are included in this view.",
        color: palette.warning,
      },
    ];

    const takeawaysSlide = pptx.addSlide();
    takeawaysSlide.background = { color: palette.navy };
    takeawaysSlide.addShape(shapeType.rect ?? "rect", {
      x: 0,
      y: 0,
      w: 0.18,
      h: 7.5,
      fill: { color: palette.primary },
      line: { color: palette.primary, transparency: 100 },
    });
    takeawaysSlide.addShape(shapeType.roundRect ?? "roundRect", {
      x: 0.8,
      y: 0.46,
      w: 4.65,
      h: 1.3,
      rectRadius: 0.12,
      fill: { color: palette.background },
      line: { color: "3A4963", pt: 1 },
    });
    takeawaysSlide.addImage({
      data: clinicLogoData,
      x: 1.02,
      y: 0.53,
      w: 4.2,
      h: 1.19,
    });
    takeawaysSlide.addText("Key takeaways", {
      x: 5.9,
      y: 0.55,
      w: 6.4,
      h: 0.62,
      fontFace: "Aptos Display",
      fontSize: 35,
      bold: true,
      color: "FFFFFF",
      margin: 0,
      align: "right",
    });
    takeawaysSlide.addText("What the selected records show at a glance", {
      x: 5.9,
      y: 1.23,
      w: 6.4,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 16,
      color: "BCC6D6",
      margin: 0,
      align: "right",
    });
    takeawayItems.forEach((item, index) => {
      const x = 0.82 + index * 3.08;
      takeawaysSlide.addShape(shapeType.line ?? "line", {
        x,
        y: 2.35,
        w: 2.65,
        h: 0,
        line: { color: item.color, pt: 3 },
      });
      takeawaysSlide.addText(item.value, {
        x,
        y: 2.63,
        w: 2.65,
        h: 0.65,
        fontFace: "Aptos Display",
        fontSize: 30,
        bold: true,
        color: item.color,
        margin: 0,
        fit: "shrink",
      });
      takeawaysSlide.addText(item.label, {
        x,
        y: 3.4,
        w: 2.65,
        h: 0.34,
        fontFace: "Aptos",
        fontSize: 16,
        bold: true,
        color: "FFFFFF",
        margin: 0,
      });
      takeawaysSlide.addText(item.detail, {
        x,
        y: 3.93,
        w: 2.65,
        h: 1.08,
        fontFace: "Aptos",
        fontSize: 13,
        color: "D7DDE8",
        margin: 0,
        valign: "top",
        fit: "shrink",
      });
    });
    takeawaysSlide.addShape(shapeType.line ?? "line", {
      x: 0.82,
      y: 5.56,
      w: 11.5,
      h: 0,
      line: { color: "3A4963", pt: 1 },
    });
    takeawaysSlide.addText(
      "These indicators describe the selected records and should be reviewed alongside the appropriate clinical context.",
      {
        x: 0.82,
        y: 5.86,
        w: 10.5,
        h: 0.42,
        fontFace: "Aptos",
        fontSize: 17,
        bold: true,
        color: "FFFFFF",
        margin: 0,
      }
    );
    takeawaysSlide.addText(
      `${analyticsFilterSummary} \u2022 Generated ${generatedDateLabel}`,
      {
        x: 0.82,
        y: 6.48,
        w: 10.5,
        h: 0.26,
        fontFace: "Aptos",
        fontSize: 10.5,
        color: "9EABC0",
        margin: 0,
        fit: "shrink",
      }
    );
    takeawaysSlide.addText("10", {
      x: 12.0,
      y: 6.43,
      w: 0.35,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 13,
      bold: true,
      color: palette.primary,
      align: "right",
      margin: 0,
    });

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
