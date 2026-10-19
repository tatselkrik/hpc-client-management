export const ANALYTICS_TIME_ZONE = "Asia/Manila";

export function wrapAnalyticsChartLabel(value: string, width = 42) {
  return value.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > width) {
        lines.push(line);
        line = "";
      }
      const parts = word.match(new RegExp(`.{1,${width}}`, "gu")) ?? [""];
      parts.forEach((part, index) => {
        if (index) { lines.push(line); line = ""; }
        line = line ? `${line} ${part}` : part;
      });
    }
    lines.push(line);
    return lines;
  }).join("\n");
}

const clinicDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function clinicDateKey(value: Date = new Date()) {
  if (Number.isNaN(value.getTime())) return "";
  const parts = clinicDateFormatter.formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatAnalyticsMonth(value: string | null | undefined) {
  if (!value) return "";
  // Intake dates are calendar dates, not UTC timestamps.
  if (/^\d{4}-(0[1-9]|1[0-2])(?:$|-\d{2}$)/.test(value)) return value.slice(0, 7);
  return clinicDateKey(new Date(value)).slice(0, 7);
}

export function formatExportDate(value: string | Date) {
  const date = typeof value === "string"
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+08:00` : value)
    : value;
  if (Number.isNaN(date.getTime())) return "Not dated";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: ANALYTICS_TIME_ZONE, month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

export function formatReportingPeriod(start: string, end: string) {
  if (start && end) return `${formatExportDate(start)} to ${formatExportDate(end)}`;
  if (start) return `From ${formatExportDate(start)}`;
  if (end) return `Through ${formatExportDate(end)}`;
  return "All available dates";
}

export function escapeAnalyticsCsvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  // Quoting alone does not stop Excel from executing formula-looking text.
  // A leading tab inside the quoted cell keeps these strings as text on import.
  // Actual numeric values retain their numeric meaning, including negatives.
  const formulaCandidate = [...raw].filter((character) => character.charCodeAt(0) > 31).join("").trimStart();
  const safe = typeof value === "string" &&
    (/^[=+\-@＝＋－＠]/u.test(formulaCandidate) || /^[\t\r\n]/.test(raw))
      ? `\t${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export type AppointmentExportRow = {
  status: string;
  client_stage_at_booking: string;
  appointment_mode: string;
};

export type AppointmentExportSnapshot = {
  start: string;
  end: string;
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
  open: number;
  firstTimers: number;
  telecounseling: number;
};

export function buildAppointmentExportSnapshot(rows: AppointmentExportRow[], start: string, end: string): AppointmentExportSnapshot {
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  const completed = count("completed");
  const cancelled = count("cancelled");
  const noShows = count("no_show");
  return {
    start, end, total: rows.length, completed, cancelled, noShows,
    open: rows.length - completed - cancelled - noShows,
    firstTimers: rows.filter((row) => row.client_stage_at_booking === "new").length,
    telecounseling: rows.filter((row) => row.appointment_mode === "telecounseling").length,
  };
}
