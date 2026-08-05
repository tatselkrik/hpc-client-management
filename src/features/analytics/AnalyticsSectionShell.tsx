import { Suspense, lazy } from "react";
import type { AnalyticsSectionProps } from "./AnalyticsSection";

const AnalyticsSection = lazy(() =>
  import("./AnalyticsSection").then((module) => ({
    default: module.AnalyticsSection,
  }))
);

export type AnalyticsSectionShellProps = AnalyticsSectionProps;

export function AnalyticsSectionShell(props: AnalyticsSectionShellProps) {
  return (
    <Suspense
      fallback={
        <div className="page-content analytics-page">
          <section className="panel analytics-filter-panel" aria-label="Analytics loading">
            <p className="analytics-status-message">Loading analytics workspace...</p>
          </section>
        </div>
      }
    >
      <AnalyticsSection {...props} />
    </Suspense>
  );
}
