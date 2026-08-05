import { SectionHeader } from "../../components/SectionHeader";
import type {
  AnalyticsCategoryFilter,
  AnalyticsDateRange,
  AnalyticsFilterOption,
  AnalyticsStatusFilter,
} from "../../appShared";

type AnalyticsFiltersPanelProps = {
  fullFilterSummary: string;
  analyticsDateRange: AnalyticsDateRange;
  setAnalyticsDateRange: (value: AnalyticsDateRange) => void;
  analyticsCustomStartDate: string;
  setAnalyticsCustomStartDate: (value: string) => void;
  analyticsCustomEndDate: string;
  setAnalyticsCustomEndDate: (value: string) => void;
  analyticsStatusFilter: AnalyticsStatusFilter;
  setAnalyticsStatusFilter: (value: AnalyticsStatusFilter) => void;
  analyticsCategoryFilter: AnalyticsCategoryFilter;
  setAnalyticsCategoryFilter: (value: AnalyticsCategoryFilter) => void;
  analyticsCategoryOptions: AnalyticsFilterOption[];
  representativeFilter: string;
  setRepresentativeFilter: (value: string) => void;
  representativeOptions: readonly string[];
  defaultRepresentativeFilterValue: string;
  isRepresentativeFilterLocked: boolean;
  isAggregateOnlyRepresentativeView: boolean;
  canUseAllRepresentativeAnalytics: boolean;
  ageBandFilter: string;
  setAgeBandFilter: (value: string) => void;
  ageBandOrder: readonly string[];
  sexFilter: string;
  setSexFilter: (value: string) => void;
  sexOptions: readonly string[];
};

export function AnalyticsFiltersPanel({
  fullFilterSummary,
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
  representativeFilter,
  setRepresentativeFilter,
  representativeOptions,
  defaultRepresentativeFilterValue,
  isRepresentativeFilterLocked,
  isAggregateOnlyRepresentativeView,
  canUseAllRepresentativeAnalytics,
  ageBandFilter,
  setAgeBandFilter,
  ageBandOrder,
  sexFilter,
  setSexFilter,
  sexOptions,
}: AnalyticsFiltersPanelProps) {
  return (
    <section className="panel analytics-filter-panel" aria-label="Analytics filters">
      <SectionHeader
        className="analytics-filter-panel-header"
        kicker="Filters"
        description={fullFilterSummary}
        descriptionClassName="analytics-filter-summary"
        actions={
          <button
            type="button"
            className="small-button secondary-button"
            onClick={() => {
              setAnalyticsDateRange("ALL");
              setAnalyticsCustomStartDate("");
              setAnalyticsCustomEndDate("");
              setAnalyticsStatusFilter("all");
              setAnalyticsCategoryFilter("all");
              setRepresentativeFilter(defaultRepresentativeFilterValue);
              setAgeBandFilter("all");
              setSexFilter("all");
            }}
          >
            Reset filters
          </button>
        }
      />

      <div className="analytics-filter-grid">
        <label className="analytics-filter-field">
          <span>Date range</span>
          <select
            value={analyticsDateRange}
            onChange={(event) => setAnalyticsDateRange(event.target.value as AnalyticsDateRange)}
          >
            <option value="ALL">All dates</option>
            <option value="LAST_30_DAYS">Last 30 days</option>
            <option value="LAST_90_DAYS">Last 90 days</option>
            <option value="THIS_YEAR">This year</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>Status</span>
          <select
            value={analyticsStatusFilter}
            onChange={(event) => setAnalyticsStatusFilter(event.target.value as AnalyticsStatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Terminated">Terminated</option>
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>Category</span>
          <select
            value={analyticsCategoryFilter}
            onChange={(event) => setAnalyticsCategoryFilter(event.target.value as AnalyticsCategoryFilter)}
          >
            {analyticsCategoryOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>HPC Representative</span>
          <select
            value={representativeFilter}
            onChange={(event) => setRepresentativeFilter(event.target.value)}
            disabled={
              isRepresentativeFilterLocked ||
              (!canUseAllRepresentativeAnalytics && representativeOptions.length === 0)
            }
          >
            {canUseAllRepresentativeAnalytics || !isRepresentativeFilterLocked ? (
              <option value="all">All representatives</option>
            ) : null}
            {representativeOptions.map((representative) => (
              <option value={representative} key={representative}>
                {representative}
              </option>
            ))}
          </select>
          {isRepresentativeFilterLocked ? (
            <small className="field-hint">
              Your analytics view is limited to your assigned representative.
            </small>
          ) : isAggregateOnlyRepresentativeView ? (
            <small className="field-hint">
              All representatives is an aggregate-only view. Select your assigned representative
              to open client-level details.
            </small>
          ) : null}
        </label>

        <label className="analytics-filter-field">
          <span>Age group</span>
          <select value={ageBandFilter} onChange={(event) => setAgeBandFilter(event.target.value)}>
            <option value="all">All age groups</option>
            {ageBandOrder.map((band) => (
              <option value={band} key={band}>
                {band}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>Sex</span>
          <select value={sexFilter} onChange={(event) => setSexFilter(event.target.value)}>
            <option value="all">All sex values</option>
            {sexOptions.map((sex) => (
              <option value={sex} key={sex}>
                {sex}
              </option>
            ))}
          </select>
        </label>

        {analyticsDateRange === "CUSTOM" && (
          <>
            <label className="analytics-filter-field">
              <span>Start date</span>
              <input
                type="date"
                value={analyticsCustomStartDate}
                onChange={(event) => setAnalyticsCustomStartDate(event.target.value)}
              />
            </label>

            <label className="analytics-filter-field">
              <span>End date</span>
              <input
                type="date"
                value={analyticsCustomEndDate}
                onChange={(event) => setAnalyticsCustomEndDate(event.target.value)}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
