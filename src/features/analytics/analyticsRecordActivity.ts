import type { AnalyticsActivityRecord } from "../../appShared";
import {
  formatMonthKeyLabel,
  formatTrendDelta,
  getMonthKeyFromDate,
  getTrendDirection,
} from "../../appShared";

export type AnalyticsActivitySeriesItem = {
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

export function buildSingleActivitySeries(
  records: AnalyticsActivityRecord[]
): AnalyticsActivitySeriesItem[] {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    const monthKey = getMonthKeyFromDate(record.created_at);
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
}

export function buildActivityDeltaMeta(
  items: Array<{ label: string; value: number }>
): AnalyticsActivityDeltaMeta {
  if (items.length === 0) {
    return {
      direction: "flat",
      message: "No activity yet",
    };
  }

  if (items.length === 1) {
    return {
      direction: getTrendDirection(items[0].value),
      message: `${items[0].value} in ${items[0].label}`,
    };
  }

  const latest = items[items.length - 1]?.value ?? 0;
  const previous = items[items.length - 2]?.value ?? 0;
  const delta = latest - previous;

  return {
    direction: getTrendDirection(delta),
    message: `${formatTrendDelta(delta)} vs previous period`,
  };
}

export function buildRecordActivityTrendSeries(
  progressNotesActivitySeries: AnalyticsActivitySeriesItem[],
  documentActivitySeries: AnalyticsActivitySeriesItem[],
  assessmentActivitySeries: AnalyticsActivitySeriesItem[]
): AnalyticsRecordActivityTrendItem[] {
  const progressMap = new Map(
    progressNotesActivitySeries.map((item) => [item.key, item.value])
  );
  const documentMap = new Map(
    documentActivitySeries.map((item) => [item.key, item.value])
  );
  const assessmentMap = new Map(
    assessmentActivitySeries.map((item) => [item.key, item.value])
  );

  const keys = Array.from(
    new Set([
      ...progressNotesActivitySeries.map((item) => item.key),
      ...documentActivitySeries.map((item) => item.key),
      ...assessmentActivitySeries.map((item) => item.key),
    ])
  )
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .slice(-6);

  return keys.map((key) => ({
    key,
    label: formatMonthKeyLabel(key),
    progressNotes: progressMap.get(key) ?? 0,
    documents: documentMap.get(key) ?? 0,
    assessments: assessmentMap.get(key) ?? 0,
  }));
}
