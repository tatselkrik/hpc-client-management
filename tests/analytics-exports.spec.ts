import { expect, test } from "@playwright/test";
import {
  buildAppointmentExportSnapshot, clinicDateKey, escapeAnalyticsCsvCell,
  formatAnalyticsMonth, formatReportingPeriod, wrapAnalyticsChartLabel,
} from "../src/features/analytics/analyticsExportHelpers";
import { readFile } from "node:fs/promises";

test("export dates use Philippine time without shifting calendar intake dates", () => {
  expect(formatAnalyticsMonth("2026-10-01")).toBe("2026-10");
  expect(formatAnalyticsMonth("2026-10-01T00:30:00+08:00")).toBe("2026-10");
  expect(formatAnalyticsMonth("2026-09-30T16:30:00Z")).toBe("2026-10");
  expect(formatAnalyticsMonth("2026-12-31T16:30:00Z")).toBe("2027-01");
  expect(formatAnalyticsMonth("not a date")).toBe("");
  expect(formatAnalyticsMonth(null)).toBe("");
  expect(clinicDateKey(new Date("2026-10-15T16:01:00Z"))).toBe("2026-10-16");
});

test("CSV formula-looking text is neutralized while numeric cells and UTF-8 survive", () => {
  for (const value of ["=2+2", "+2+2", "-2+2", "@SUM(1)", "  =2+2", "\t=2+2", "\r=2+2", "＝2+2"]) {
    expect(escapeAnalyticsCsvCell(value)).toBe('"' + "\t" + value + '"');
  }
  expect(escapeAnalyticsCsvCell(-12)).toBe('"-12"');
  expect(escapeAnalyticsCsvCell('Bacolod, "ñ"\nline')).toBe('"Bacolod, ""ñ""\nline"');
  expect(escapeAnalyticsCsvCell(null)).toBe('""');
});

test("report scope uses selected bounds rather than record creation dates", () => {
  const scope = formatReportingPeriod("2026-10-01", "2026-10-31");
  expect(scope).toContain("October");
  expect(scope).toContain("2026");
  expect(scope).not.toContain("2000");
  expect(formatReportingPeriod("", "")).toBe("All available dates");
  expect(formatReportingPeriod("2026-10-01", "")).toMatch(/^From /);
});

test("appointment export totals reconcile without resolving open appointments", () => {
  const snapshot = buildAppointmentExportSnapshot([
    { status: "completed", client_stage_at_booking: "new", appointment_mode: "in_person" },
    { status: "cancelled", client_stage_at_booking: "existing", appointment_mode: "telecounseling" },
    { status: "no_show", client_stage_at_booking: "existing", appointment_mode: "in_person" },
    { status: "confirmed", client_stage_at_booking: "new", appointment_mode: "in_person" },
  ], "2026-09-16T02:00:00Z", "2026-10-16T02:00:00Z");
  expect(snapshot).toMatchObject({ total: 4, completed: 1, cancelled: 1, noShows: 1, open: 1, firstTimers: 2, telecounseling: 1 });
  expect(snapshot.completed + snapshot.cancelled + snapshot.noShows + snapshot.open).toBe(snapshot.total);
});

test("long chart labels wrap without losing words", () => {
  const label = "Clinician Example with a deliberately long fictional name for checking readable chart labels";
  expect(wrapAnalyticsChartLabel(label).replace(/\s+/g, " ")).toBe(label);
  expect(wrapAnalyticsChartLabel("X".repeat(150)).replaceAll("\n", "")).toBe("X".repeat(150));
});

test("CSV and presentation contracts use the corrected definitions", async () => {
  const section = await readFile("src/features/analytics/AnalyticsSection.tsx", "utf8");
  const presentation = await readFile("src/features/analytics/exportAnalyticsPresentation.ts", "utf8");
  expect(section).toContain("const fourPsComplete = hasCompleteFourPsRows(fourPsRecord)");
  expect(section).toContain("escapeAnalyticsCsvCell(value)");
  expect(section).toContain("reportingRangeLabel: viewModel.analyticsReportingPeriod");
  expect(presentation).not.toContain("validAnalyticsDates");
  expect(presentation).not.toContain(".slice(0, 8)");
  expect(presentation).not.toContain("Severity 4–5 or recent behavior");
  expect(presentation).toContain('if (total <= 0) return "N/A"');
});
