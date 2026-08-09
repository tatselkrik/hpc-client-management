import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ANALYTICS_COLOR_TOKENS } from "../../appShared";

export type AnalyticsDistributionItem = {
  label: string;
  value: number;
};

export type AnalyticsGroupedDistributionItem = {
  label: string;
  primary: number;
  secondary: number;
};

type DonutChartOptions = {
  centerItemLabel?: string;
  centerLabel?: string;
  centerMode?: "total" | "item" | "topItem";
  className?: string;
  hideCenterText?: boolean;
  maxLegendItems?: number;
  showCenterPercentage?: boolean;
};

const analyticsGreen = ANALYTICS_COLOR_TOKENS[1];
const analyticsRed = "#ef4444";
const chartGridColor = "rgba(148, 163, 184, 0.28)";
const chartAxisColor = "var(--muted)";

const chartTooltipStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "var(--shadow)",
  color: "var(--text)",
  background: "var(--surface)",
};

const formatChartPercent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";

const compactTimelineLabel = (label: string) => {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return "";

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
  const [monthPart, yearPart] = trimmedLabel.split(/\s+/);
  const monthIndex = monthNames.findIndex(
    (monthName) =>
      monthName.startsWith(monthPart.toLowerCase()) ||
      monthName.slice(0, 3) === monthPart.toLowerCase().slice(0, 3)
  );

  if (monthIndex >= 0 && yearPart) {
    return `${monthNames[monthIndex].slice(0, 3)} ${yearPart.replace(/^20/, "'")}`;
  }

  return trimmedLabel;
};

const getChartColor = (
  item: { label: string; value?: number },
  index: number,
  getItemColor?: (item: AnalyticsDistributionItem, index: number) => string
) =>
  getItemColor?.({ label: item.label, value: item.value ?? 0 }, index) ??
  ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length];

export const analyticsChartColors = {
  status: (item: AnalyticsDistributionItem, index: number) => {
    const label = item.label.toLowerCase();
    if (label.includes("active")) return analyticsGreen;
    if (label.includes("terminated")) return analyticsRed;
    return ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length];
  },
  multipleConcerns: (item: AnalyticsDistributionItem, index: number) =>
    item.label === "Multiple concerns"
      ? analyticsRed
      : ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length],
  suicidalIdeation: (item: AnalyticsDistributionItem, index: number) =>
    item.label === "With suicidal ideation"
      ? analyticsRed
      : ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length],
  preExistingDiagnosis: (item: AnalyticsDistributionItem, index: number) => {
    if (item.label === "Diagnosis indicated") return analyticsRed;
    if (item.label === "No diagnosis indicated") return analyticsGreen;
    return ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length];
  },
  cssrsCompletion: (item: AnalyticsDistributionItem, index: number) => {
    if (item.label === "Completed") return analyticsGreen;
    if (item.label === "Pending") return analyticsRed;
    return ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length];
  },
  elevatedCssrs: (item: AnalyticsDistributionItem, index: number) =>
    item.label === "Elevated"
      ? analyticsRed
      : ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length],
  fourPsCompletion: (item: AnalyticsDistributionItem) =>
    item.label === "4Ps complete" ? analyticsGreen : analyticsRed,
  narrativeReport: (item: AnalyticsDistributionItem) =>
    item.label === "Narrative reports" ? analyticsGreen : analyticsRed,
  cssrsSeverity: (label: string) => {
    const level = Number(label.replace(/[^0-9]/g, ""));
    switch (level) {
      case 1:
        return "#facc15";
      case 2:
        return "#f59e0b";
      case 3:
        return "#fb923c";
      case 4:
        return "#f97316";
      case 5:
        return "#dc2626";
      default:
        return ANALYTICS_COLOR_TOKENS[0];
    }
  },
};

export const renderBarDistributionVisual = (
  items: AnalyticsDistributionItem[],
  emptyLabel: string,
  _onSelectItem?: (item: AnalyticsDistributionItem) => void,
  getItemColor?: (item: AnalyticsDistributionItem, index: number) => string
) => {
  const visibleItems = items.filter((item) => item.value > 0).slice(0, 10);

  if (visibleItems.length === 0) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const chartHeight = Math.max(170, visibleItems.length * 34 + 34);

  return (
    <div className="analytics-recharts-shell analytics-recharts-bar-shell">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={visibleItems}
          layout="vertical"
          margin={{ top: 4, right: 42, bottom: 4, left: 8 }}
          barCategoryGap={9}
        >
          <CartesianGrid horizontal={false} stroke={chartGridColor} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartAxisColor, fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [
              `${Number(value).toLocaleString()} (${formatChartPercent(Number(value), total)})`,
              "Clients",
            ]}
          />
          <Bar dataKey="value" radius={[0, 9, 9, 0]} barSize={18}>
            {visibleItems.map((item, index) => (
              <Cell
                key={item.label}
                fill={getChartColor(item, index, getItemColor)}
                cursor="default"
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => Number(value ?? 0).toLocaleString()}
              className="analytics-recharts-value-label"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const renderDonutChart = (
  items: AnalyticsDistributionItem[],
  emptyLabel: string,
  centerLabel: string,
  _onSelectItem?: (item: AnalyticsDistributionItem) => void,
  getItemColor?: (item: AnalyticsDistributionItem, index: number) => string,
  options: DonutChartOptions = {}
) => {
  const visibleItems = items.filter((item) => item.value > 0);

  if (visibleItems.length === 0) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const centerCaption = total === 1 ? centerLabel.replace(/s$/, "") : centerLabel;
  const centerMode = options.centerMode ?? "total";
  const sortedVisibleItems = [...visibleItems].sort(
    (left, right) => right.value - left.value || left.label.localeCompare(right.label)
  );
  const selectedCenterItem =
    centerMode === "topItem"
      ? sortedVisibleItems[0]
      : options.centerItemLabel
        ? items.find((item) => item.label === options.centerItemLabel) ?? visibleItems[0]
        : visibleItems[0];
  const shouldShowItemCenter = centerMode !== "total" && Boolean(selectedCenterItem);
  const centerValue = shouldShowItemCenter ? selectedCenterItem.value : total;
  const centerText = options.showCenterPercentage
    ? `${centerValue.toLocaleString()} (${formatChartPercent(centerValue, total)})`
    : centerValue.toLocaleString();
  const centerTextLabel = shouldShowItemCenter
    ? options.centerLabel ?? selectedCenterItem.label
    : options.centerLabel ?? centerCaption;

  return (
    <div className={`analytics-recharts-donut-layout ${options.className ?? ""}`.trim()}>
      <div
        className="analytics-recharts-donut-wrap"
        role="img"
        aria-label={`${centerLabel}: ${total.toLocaleString()}`}
      >
        <ResponsiveContainer width="100%" height={168}>
          <PieChart>
            <Pie
              data={visibleItems}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={74}
              paddingAngle={visibleItems.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={4}
            >
              {visibleItems.map((item, index) => (
                <Cell
                  key={item.label}
                  fill={
                    getItemColor?.(item, index) ??
                    ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length]
                  }
                  cursor="default"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [
                `${Number(value).toLocaleString()} (${formatChartPercent(Number(value), total)})`,
                "Clients",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {!options.hideCenterText && (
          <div className="analytics-recharts-donut-center" aria-hidden="true">
            <strong>{centerText}</strong>
            <span>{centerTextLabel}</span>
          </div>
        )}
      </div>

      <div className="analytics-legend analytics-recharts-legend">
        {visibleItems.slice(0, options.maxLegendItems ?? 6).map((item, index) => (
          <div className="analytics-legend-row" key={item.label}>
            <span
              className="analytics-color-dot"
              style={{
                background:
                  getItemColor?.(item, index) ??
                  ANALYTICS_COLOR_TOKENS[index % ANALYTICS_COLOR_TOKENS.length],
              }}
            />
            <span className="analytics-legend-label">{item.label}</span>
            <strong className="analytics-legend-value">
              {item.value.toLocaleString()} ({formatChartPercent(item.value, total)})
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export const renderGroupedHorizontalBarChart = (
  items: AnalyticsGroupedDistributionItem[],
  emptyLabel: string,
  primaryLabel: string,
  secondaryLabel: string
) => {
  const visibleItems = items.filter((item) => item.primary > 0 || item.secondary > 0).slice(0, 8);

  if (visibleItems.length === 0) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  const chartHeight = Math.max(190, visibleItems.length * 44 + 38);

  return (
    <div className="analytics-recharts-shell">
      <div className="analytics-grouped-bar-legend">
        <span><i className="primary" /> {primaryLabel}</span>
        <span><i className="secondary" /> {secondaryLabel}</span>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={visibleItems}
          layout="vertical"
          margin={{ top: 8, right: 34, bottom: 4, left: 8 }}
          barCategoryGap={12}
        >
          <CartesianGrid horizontal={false} stroke={chartGridColor} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={136}
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartAxisColor, fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar
            dataKey="primary"
            name={primaryLabel}
            fill="var(--analytics-tone-1)"
            radius={[0, 8, 8, 0]}
            barSize={12}
          >
            <LabelList
              dataKey="primary"
              position="right"
              formatter={(value) => Number(value ?? 0).toLocaleString()}
              className="analytics-recharts-value-label"
            />
          </Bar>
          <Bar
            dataKey="secondary"
            name={secondaryLabel}
            fill="var(--analytics-tone-2)"
            radius={[0, 8, 8, 0]}
            barSize={12}
          >
            <LabelList
              dataKey="secondary"
              position="right"
              formatter={(value) => Number(value ?? 0).toLocaleString()}
              className="analytics-recharts-value-label"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const renderLineAreaChart = (
  items: AnalyticsDistributionItem[],
  emptyLabel: string
) => {
  if (items.length === 0 || items.every((item) => item.value <= 0)) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  const chartItems = items.map((item) => ({
    ...item,
    displayLabel: compactTimelineLabel(item.label),
  }));

  return (
    <div className="analytics-recharts-shell analytics-recharts-line-shell">
      <ResponsiveContainer width="100%" height={232}>
        <AreaChart data={chartItems} margin={{ top: 14, right: 22, bottom: 2, left: -20 }}>
          <CartesianGrid stroke={chartGridColor} vertical={false} />
          <XAxis
            dataKey="displayLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartAxisColor, fontSize: 12, fontWeight: 600 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartAxisColor, fontSize: 12 }}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value) => [Number(value).toLocaleString(), "Clients"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.label ? payload[0].payload.label : ""
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--analytics-tone-1)"
            strokeWidth={4}
            fill="rgba(99, 102, 241, 0.14)"
            dot={{ r: 4, strokeWidth: 3, fill: "var(--surface)" }}
            activeDot={{ r: 6, strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
