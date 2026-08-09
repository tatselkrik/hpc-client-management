import { SectionHeader } from "../../components/SectionHeader";
import type { AnalyticsClientDrilldownGroup } from "../../appShared";

export type AnalyticsQuickReadItem = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

export type AnalyticsSummaryCard = {
  label: string;
  value: string;
  meta: string;
  comparison: string;
  drilldownGroup: AnalyticsClientDrilldownGroup;
};

type AnalyticsQuickReadProps = {
  filterSummary: string;
  items: AnalyticsQuickReadItem[];
};

type AnalyticsSummaryMetricsProps = {
  cards: AnalyticsSummaryCard[];
  canOpenClientLevelAnalytics: boolean;
  onOpenDrilldown: (group: AnalyticsClientDrilldownGroup) => void;
};

function SummaryIcon({ index }: { index: number }) {
  const paths = [
    <path key="clients" d="M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5 0a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2.5 21v-2.2C2.5 15.6 5 13 8 13s5.5 2.6 5.5 5.8V21h-11Zm12 0v-2.5c0-1.6-.5-3-1.4-4.1 1-.9 2.2-1.4 3.4-1.4 2.8 0 5 2.4 5 5.4V21h-7Z" fill="currentColor" />,
    <path key="active" d="M12 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 10v-2.2C4 15.1 7.2 13 12 13s8 2.1 8 5.8V21H4Z" fill="currentColor" />,
    <path key="terminated" d="M12 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 10v-2.2C4 15.1 7.2 13 12 13s8 2.1 8 5.8V21H4Zm13.5-8.5 4 4m0-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />,
    <path key="risk" d="M12 2 4.5 5.4v5.8c0 4.8 3.2 9.1 7.5 10.8 4.3-1.7 7.5-6 7.5-10.8V5.4L12 2Zm0 5v6M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />,
    <path key="complete" d="M9.5 16.2 5.8 12.5l-2 2 5.7 5.7L21 8.7l-2-2-9.5 9.5Z" fill="currentColor" />,
    <path key="notes" d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 5h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />,
  ];

  return <svg viewBox="0 0 24 24">{paths[index] ?? paths[0]}</svg>;
}

export function AnalyticsQuickRead({ filterSummary, items }: AnalyticsQuickReadProps) {
  return (
    <section className="analytics-quick-read" aria-label="Analytics quick read">
      <div className="analytics-quick-read-intro">
        <span className="analytics-quick-read-kicker">Selected view</span>
        <strong>{filterSummary}</strong>
        <span>Three signals to orient the current analytics view.</span>
      </div>

      <div className="analytics-quick-read-grid">
        {items.map((item) => (
          <div
            className={`analytics-quick-read-item analytics-quick-read-${item.tone}`}
            key={item.label}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsSummaryMetrics({
  cards,
  canOpenClientLevelAnalytics,
  onOpenDrilldown,
}: AnalyticsSummaryMetricsProps) {
  return (
    <section className="analytics-section">
      <SectionHeader
        className="analytics-section-header"
        kicker="1. Summary Metrics"
        description="High-level workload and documentation indicators for the selected view."
        descriptionClassName="analytics-section-copy"
      />

      <div className="analytics-summary-grid">
        {cards.map((card, index) => (
          <button
            type="button"
            className={
              canOpenClientLevelAnalytics
                ? "analytics-summary-card analytics-clickable-card"
                : "analytics-summary-card"
            }
            key={card.label}
            onClick={() => onOpenDrilldown(card.drilldownGroup)}
            disabled={!canOpenClientLevelAnalytics}
          >
            <span className={`analytics-summary-icon analytics-summary-icon-${index + 1}`} aria-hidden="true">
              <SummaryIcon index={index} />
            </span>
            <span className="analytics-summary-label">{card.label}</span>
            <div className="analytics-summary-main">
              <strong className="analytics-summary-value">{card.value}</strong>
            </div>
            <small className="analytics-summary-meta">{card.meta}</small>
            <small className="analytics-summary-comparison">{card.comparison}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
