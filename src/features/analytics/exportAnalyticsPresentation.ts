import { recordExportPreparation } from "../../lib/exportAudit";
import { assertClinicalSession, getClinicalSessionGeneration } from "../../lib/clinicalSession";
import { clinicDateKey, formatExportDate, formatReportingPeriod, wrapAnalyticsChartLabel, type AppointmentExportSnapshot } from "./analyticsExportHelpers";
import { save } from "@tauri-apps/plugin-dialog";
import { CLINIC_ICON_URL, CLINIC_LOGO_URL } from "../../lib/branding";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { writeFile } from "@tauri-apps/plugin-fs";
import type PptxTypes from "pptxgenjs";
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
  reportingRangeLabel?: string;
  appointmentSnapshot?: AppointmentExportSnapshot | null;
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
  if (total <= 0) return "N/A";
  return `${((value / total) * 100).toFixed(1)}%`;
};

const loadPresentationImage = async (assetPath: string) => {
  // Embedded private PNGs need no fetch (also respects native connect-src CSP).
  if (assetPath.startsWith("data:image/png;base64,")) return assetPath;
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

export async function exportAnalyticsPresentation(params: AnalyticsPresentationExportParams) {
  const generation = getClinicalSessionGeneration();
  if (params.isAnalyticsExporting) return;
  const { setAnalyticsExportStatus, setIsAnalyticsExporting } = params;
  setAnalyticsExportStatus(feedbackMessages.loading("Preparing presentation deck"));
  setIsAnalyticsExporting(true);
  try {
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    const icon = await loadPresentationImage(CLINIC_ICON_URL);
    const logo = await loadPresentationImage(CLINIC_LOGO_URL);
    const palette = {
      ivory: "F8F5EF", navy: "162631", text: "23343E", muted: "62716F",
      coral: "DE7864", green: "367565", grid: "DEDCD4", white: "FFFFFF",
    };
    const font = "Segoe UI";
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = APP_PRODUCT_NAME;
    pptx.company = CLINIC_NAME;
    pptx.subject = "Aggregated clinic analytics";
    pptx.title = "Clinic analytics";
    pptx.theme = { headFontFace: font, bodyFontFace: font };
    const reportingRange = params.reportingRangeLabel || params.analyticsFilterSummary || "All available dates";
    const generated = formatExportDate(new Date());
    let slideNumber = 0;
    type Slide = ReturnType<typeof pptx.addSlide>;
    const text = (slide: Slide, value: string, x: number, y: number, w: number, h: number,
      size = 18, color = palette.text, bold = false) => {
      slide.addText(value, { x, y, w, h, fontFace: font, fontSize: size, color, bold,
        margin: 0, valign: "middle", wrap: true });
    };
    const frame = (title: string, subtitle = "", dark = false) => {
      const slide = pptx.addSlide();
      slideNumber++;
      slide.background = { color: dark ? palette.navy : palette.ivory };
      if (title) text(slide, title, 0.8, 0.52, 10.9, 0.62, 32, dark ? palette.white : palette.navy, true);
      if (subtitle) text(slide, subtitle, 0.83, 1.25, 11.55, 0.6, 16, dark ? "D5DEDC" : palette.muted);
      slide.addImage({ data: icon, x: 11.91, y: 0.52, w: 0.53, h: 0.53 });
      text(slide, "Confidential clinic analytics", 0.83, 7.04, 8.8, 0.22, 11, dark ? "BBC9C6" : palette.muted);
      text(slide, String(slideNumber).padStart(2, "0"), 12.0, 7.02, 0.42, 0.25, 12, dark ? palette.coral : palette.green, true);
      return slide;
    };
    const metrics = (slide: Slide, items: Array<{ label: string; value: string | number; detail: string }>, y = 2.13) => {
      const width = 11.5 / items.length;
      items.forEach((item, index) => {
        const x = 0.83 + index * width;
        text(slide, String(item.value), x, y, width - 0.28, 0.85, 42, index % 2 ? palette.green : palette.coral, true);
        text(slide, item.label, x, y + 0.94, width - 0.3, 0.4, 19, palette.navy, true);
        text(slide, item.detail, x, y + 1.42, width - 0.32, 0.92, 17, palette.muted);
      });
    };
    const chartOptions: PptxTypes.IChartOpts = {
      x: 0.83, y: 2.0, w: 11.6, h: 4.65,
      showTitle: false, showLegend: false,
      chartArea: { fill: { color: palette.ivory } },
      plotArea: { fill: { color: palette.ivory } },
      catAxisLabelFontFace: font, catAxisLabelFontSize: 16, catAxisLabelColor: palette.muted,
      valAxisLabelFontFace: font, valAxisLabelFontSize: 14, valAxisLabelColor: palette.muted,
      valAxisMinVal: 0, valLabelFormatCode: "0", showValue: true,
      dataLabelFormatCode: "0", dataLabelColor: palette.text, dataLabelPosition: "outEnd" as const,
      dataLabelFontFace: font, dataLabelFontSize: 16,
      valGridLine: { color: palette.grid, size: 1 }, catAxisLineShow: false, valAxisLineShow: false,
    };
    const noData = (slide: Slide, message = "No records in the selected view") =>
      text(slide, message, 0.85, 3.15, 11.5, 0.8, 26, palette.muted);
    const distributions = (title: string, items: DistributionItem[], subtitle = "Count of clients in the selected view", color = palette.coral) => {
      const visible = items.filter((item) => Number.isFinite(item.value) && item.value > 0);
      if (!visible.length) { noData(frame(title, subtitle)); return; }
      const longest = Math.max(...visible.map((item) => item.label.length));
      const maxLines = Math.max(...visible.map((item) => wrapAnalyticsChartLabel(item.label).split("\n").length));
      const pageSize = longest > 100 || maxLines >= 3 ? 4 : longest > 60 || maxLines >= 2 ? 6 : 8;
      for (let offset = 0; offset < visible.length; offset += pageSize) {
        const page = visible.slice(offset, offset + pageSize).reverse();
        const pageTitle = visible.length > pageSize ? title + " (" + (Math.floor(offset / pageSize) + 1) + "/" + Math.ceil(visible.length / pageSize) + ")" : title;
        const slide = frame(pageTitle, subtitle);
        slide.addChart(pptx.ChartType.bar, [{
          name: title, labels: page.map((item) => wrapAnalyticsChartLabel(item.label)), values: page.map((item) => item.value),
        }], {
          ...chartOptions, barDir: "bar", catAxisLabelPos: "low", catAxisLabelFontSize: 16,
          catAxisOrientation: "minMax", valAxisHidden: true, chartColors: [color],
          barGapWidthPct: 85, showValue: true,
          layout: { x: 0.38, y: 0.05, w: 0.55, h: 0.88 },
        });
      }
    };
    const trends = (title: string, series: Array<{ name: string; labels: string[]; values: number[] }>, subtitle: string) => {
      const periodCount = series[0]?.labels.length ?? 0;
      const pageSize = 12;
      if (!periodCount || !series.some((item) => item.values.some((value) => value > 0))) {
        noData(frame(title, subtitle)); return;
      }
      for (let offset = 0; offset < periodCount; offset += pageSize) {
        const slide = frame(periodCount > pageSize ? title + " (" + (offset / pageSize + 1) + "/" + Math.ceil(periodCount / pageSize) + ")" : title, subtitle);
        slide.addChart(pptx.ChartType.line, series.map((item) => ({
          name: item.name, labels: item.labels.slice(offset, offset + pageSize), values: item.values.slice(offset, offset + pageSize),
        })), { ...chartOptions, showValue: false, showLegend: series.length > 1,
          legendPos: "b", legendFontFace: font, legendFontSize: 16,
          chartColors: [palette.coral, palette.green], lineSize: 3,
          lineDataSymbol: "circle", lineDataSymbolSize: 6, catAxisLabelFontSize: 14,
        });
      }
    };

    const cover = frame("", "", true);
    cover.addShape(pptx.ShapeType.rect, {
      x: 0.83, y: 0.63, w: 4.0, h: 1.14,
      fill: { color: palette.ivory }, line: { color: palette.ivory, transparency: 100 },
    });
    cover.addImage({ data: logo, x: 0.88, y: 0.65, w: 3.9, h: 1.1 });
    text(cover, "Clinic\nanalytics", 0.8, 2.05, 11.0, 2.1, 58, palette.white, true);
    text(cover, reportingRange, 0.85, 4.68, 10.9, 0.9, 24, palette.coral);
    text(cover, "Generated " + generated + " in Philippine time", 0.85, 5.85, 10.6, 0.48, 17, "D5DEDC");

    const total = params.analyticsClientRows.length;
    const active = params.statusDistribution.find((item) => item.label === "Active")?.value ?? 0;
    const overview = frame("Caseload overview", reportingRange);
    metrics(overview, [
      { label: "Clients", value: total.toLocaleString(), detail: "Included in the selected client view" },
      { label: "Active", value: formatAnalyticsPercentage(active, total), detail: active.toLocaleString() + " active client records" },
      { label: "4Ps complete", value: formatAnalyticsPercentage(params.total4PsCompleteCount, total), detail: params.total4PsCompleteCount.toLocaleString() + " records with every row filled" },
    ]);
    text(overview, total ? "Client counts describe the selected cohort. Record activity reflects records attached to that cohort." : "No clients match the selected filters. Percentages with no denominator are N/A.", 0.85, 5.43, 11.5, 0.85, 21, palette.muted);

    if (total) {
      trends("Client intake over time", [{ name: "Clients", labels: params.visibleIntakeSeries.map((item) => item.label), values: params.visibleIntakeSeries.map((item) => item.value) }], "Intake timeline and grouping currently shown in Analytics");
      distributions("Care team caseload", params.representativeDistribution, "Client assignments visible to your selected representative view", palette.green);
      distributions("Client status", params.statusDistribution);
      distributions("Client categories", params.categoryDistribution);
      distributions("Age groups", params.ageDistribution);
      distributions("Sex", params.sexDistribution, "Structured intake field; missing values remain explicitly labeled");
      distributions("Sexual orientation", params.sexualOrientationDistribution, "Structured intake field; missing values remain explicitly labeled", palette.green);
      distributions("Marital status", params.maritalStatusDistribution);
      distributions("Employment status", params.employmentStatusDistribution, "Structured intake field", palette.green);
      distributions("Counseling reasons", params.counsellingReasonDistribution, "A client can have more than one reason; counts can exceed the number of clients");
      const screening = frame("C-SSRS screening", "Screening indicators describe recorded responses, not diagnoses");
      metrics(screening, [
        { label: "Screening needed", value: params.clientsWithSuicidalIdeation.length, detail: "Clients with Suicidal Ideation selected" },
        { label: "Completed", value: formatAnalyticsPercentage(params.cssrsCompletedForIdeationCount, params.clientsWithSuicidalIdeation.length), detail: params.cssrsCompletedForIdeationCount + " complete; " + params.cssrsPendingForIdeationCount + " pending" },
        { label: "Severity 4 or 5", value: params.elevatedCssrsCount, detail: "The existing dashboard's elevated-severity count" },
      ]);
      text(screening, params.clientsWithPreExistingDiagnosis.length + " clients have a pre-existing psychiatric diagnosis indicated in the intake record.", 0.85, 5.5, 11.5, 0.8, 21, palette.muted);
      if (params.clientsWithSuicidalIdeation.length) {
        distributions("C-SSRS severity", params.cssrsSeverityDistribution, "Among clients with Suicidal Ideation selected");
        distributions("C-SSRS behavior", params.cssrsBehaviorDistribution, "Lifetime and recent behavior are separate recorded indicators");
        distributions("Recorded mental status", params.mentalStatusDistribution, "Recorded selections among ideation-flagged clients; multiple selections can apply");
      }
      const fourPs = frame("4Ps and narrative coverage", "The existing completion definitions, with separate narrative coverage");
      metrics(fourPs, [
        { label: "4Ps complete", value: params.total4PsCompleteCount, detail: "At least one entry in every 4Ps row" },
        { label: "With narrative", value: params.total4PsNarrativeCount, detail: "Completed 4Ps records with a narrative" },
        { label: "Without narrative", value: Math.max(params.total4PsCompleteCount - params.total4PsNarrativeCount, 0), detail: "Completed 4Ps records still lacking a narrative" },
      ]);
      const coverage = params.narrativeCoverageGroupedByRepresentative.filter((item) => item.primary > 0 || item.secondary > 0);
      const coveragePageSize = coverage.some((item) => item.label.length > 60) ? 4 : 6;
      for (let offset = 0; offset < coverage.length; offset += coveragePageSize) {
        const page = coverage.slice(offset, offset + coveragePageSize).reverse();
        const slide = frame("4Ps coverage by clinician", "All represented clinicians, page " + (offset / coveragePageSize + 1) + " of " + Math.ceil(coverage.length / coveragePageSize));
        slide.addChart(pptx.ChartType.bar, [
          { name: "4Ps complete", labels: page.map((item) => wrapAnalyticsChartLabel(item.label)), values: page.map((item) => item.primary) },
          { name: "With narrative", labels: page.map((item) => wrapAnalyticsChartLabel(item.label)), values: page.map((item) => item.secondary) },
        ], { ...chartOptions, barDir: "bar", catAxisOrientation: "minMax", valAxisHidden: true,
          chartColors: [palette.coral, palette.green], showLegend: true, legendPos: "b", legendFontFace: font, legendFontSize: 16,
          layout: { x: 0.38, y: 0.05, w: 0.55, h: 0.8 },
        });
      }
      const records = frame("Documentation activity", "Record totals for clients in the selected view");
      metrics(records, [
        { label: "Progress notes", value: params.totalProgressNoteCount, detail: params.clientsWithProgressNotesCount + " clients with notes; " + params.clientsWithoutProgressNotesCount + " without" },
        { label: "Documents", value: params.totalDocumentCount, detail: "Uploaded document records" },
        { label: "Assessments", value: params.totalAssessmentCount, detail: "Uploaded assessment records" },
      ]);
      trends("Progress notes over time", [{ name: "Progress notes", labels: params.recordActivityTrendSeries.map((item) => item.label), values: params.recordActivityTrendSeries.map((item) => item.progressNotes) }], "Record creation dates for clients in the selected view");
      distributions("Progress notes by clinician", params.progressNotesByRepresentativeDistribution, "Record counts for clients in the selected view", palette.green);
      trends("Documents and assessments", [
        { name: "Documents", labels: params.recordActivityTrendSeries.map((item) => item.label), values: params.recordActivityTrendSeries.map((item) => item.documents) },
        { name: "Assessments", labels: params.recordActivityTrendSeries.map((item) => item.label), values: params.recordActivityTrendSeries.map((item) => item.assessments) },
      ], "Record creation dates for clients in the selected view");
    }

    const appointments = params.appointmentSnapshot;
    if (appointments) {
      const resolved = appointments.completed + appointments.cancelled + appointments.noShows;
      const slide = frame("Appointment outcomes", "Separate operations window: " + formatReportingPeriod(appointments.start, appointments.end));
      metrics(slide, [
        { label: "Appointments", value: appointments.total, detail: "Starts within the preceding 30 days" },
        { label: "Completion", value: formatAnalyticsPercentage(appointments.completed, resolved), detail: appointments.completed + " completed out of " + resolved + " resolved visits" },
        { label: "Still open", value: appointments.open, detail: "Scheduled, confirmed, arrived or in session" },
      ], 1.98);
      text(slide, appointments.cancelled + " cancelled. " + appointments.noShows + " no-show" + (appointments.noShows === 1 ? "" : "s") + ". " + appointments.firstTimers + " first-time booking" + (appointments.firstTimers === 1 ? "" : "s") + ". " + appointments.telecounseling + " telecounseling appointment" + (appointments.telecounseling === 1 ? "" : "s") + ".", 0.85, 4.91, 11.5, 0.8, 21, palette.green, true);
      text(slide, "Appointments use the existing 30-day operations panel and role permissions, independently of the client filters. Removed bookings and future starts are excluded.", 0.85, 5.88, 11.5, 0.7, 17, palette.muted);
      distributions("Appointment status", [
        { label: "Completed", value: appointments.completed },
        { label: "Cancelled", value: appointments.cancelled },
        { label: "No-show", value: appointments.noShows },
        { label: "Still open", value: appointments.open },
      ], "Separate 30-day operations view; client filters do not apply", palette.green);
    } else {
      const slide = frame("Appointment outcomes", "Separate 30-day operations view");
      noData(slide, "Appointment data is still loading or unavailable");
      text(slide, "No appointment figures have been inferred or exported as zero.", 0.85, 4.18, 11.5, 0.65, 20, palette.muted);
    }
    const filterChunks = params.analyticsFilterSummary.match(/[\s\S]{1,900}/g) ?? ["All client analytics"];
    filterChunks.forEach((filters, index) => {
      const slide = frame(index ? "Report scope (continued " + (index + 1) + ")" : "Report scope", reportingRange);
      text(slide, filters.replace(/ • /g, "\n"), 0.85, 2.1, 11.5, 3.0, 18);
      text(slide, "Aggregated client data only. No client names, raw identifiers, narratives or clinical free text appear in this presentation. Small groups may still be identifying; share only with authorized recipients.", 0.85, 5.56, 11.5, 1.0, 17, palette.muted);
    });
    if (appointments) {
      const slide = frame("Appointment reporting scope", "The exact operations interval, in Philippine time");
      const stamp = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" }).format(new Date(value));
      text(slide, "Start, included: " + stamp(appointments.start) + "\nEnd, excluded: " + stamp(appointments.end), 0.85, 2.1, 11.5, 1.65, 24);
      text(slide, "Completion rate = completed / (completed + cancelled + no-show). Open appointments are not part of the denominator. Figures reflect current appointment statuses, not a clinical outcome measure.", 0.85, 4.2, 11.5, 1.35, 21, palette.muted);
    }

    const selected = await save({ title: "Save clinic analytics presentation",
      defaultPath: "hpc-clinic-analytics-report-" + clinicDateKey() + ".pptx",
      filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
    });
    if (!selected) { setAnalyticsExportStatus(feedbackMessages.cancelled("Presentation export")); return; }
    const finalPath = selected;
    const bytes = await pptx.write({ outputType: "arraybuffer" });
    await recordExportPreparation("PowerPoint", params.analyticsClientRows.length, generation);
    assertClinicalSession(generation);
    await writeFile(finalPath, new Uint8Array(bytes as ArrayBuffer));
    setAnalyticsExportStatus("Clinic analytics presentation saved to " + finalPath + ".");
  } catch (error) {
    setAnalyticsExportStatus(feedbackMessages.error("We could not create the presentation.", getErrorDetail(error, "Unknown presentation export error")));
  } finally {
    setIsAnalyticsExporting(false);
  }
}
