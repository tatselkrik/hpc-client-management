import { SectionHeader } from "../../components/SectionHeader";
import type {
  AnalyticsClientDrilldownGroup,
  AnalyticsDrilldownClient,
} from "../../appShared";

export type DrilldownPageSize = "20" | "50" | "100" | "all";

type DrilldownPageSizeOption = {
  value: DrilldownPageSize;
  label: string;
};

type AnalyticsDrilldownPanelProps = {
  activeDrilldown: AnalyticsClientDrilldownGroup | null;
  drilldownPageSize: DrilldownPageSize;
  setDrilldownPageSize: (value: DrilldownPageSize) => void;
  drilldownPageSizeOptions: DrilldownPageSizeOption[];
  visibleDrilldownClients: AnalyticsDrilldownClient[];
  activeDrilldownIsLimited: boolean;
  closeAnalyticsDrilldown: () => void;
};

export function AnalyticsDrilldownPanel({
  activeDrilldown,
  drilldownPageSize,
  setDrilldownPageSize,
  drilldownPageSizeOptions,
  visibleDrilldownClients,
  activeDrilldownIsLimited,
  closeAnalyticsDrilldown,
}: AnalyticsDrilldownPanelProps) {
  if (!activeDrilldown) return null;

  return (
    <section className="panel analytics-drilldown-panel" aria-live="polite">
      <SectionHeader
        className="analytics-panel-header"
        kicker={activeDrilldown.title}
        description={
          activeDrilldown.clients.length > 0
            ? `${activeDrilldown.clients.length} clients match this view.`
            : activeDrilldown.emptyLabel
        }
        descriptionClassName="analytics-panel-supporting-copy"
        actions={
          <div className="analytics-drilldown-header-actions">
            {activeDrilldown.clients.length > 0 && (
              <label className="analytics-drilldown-page-size">
                <span>Rows</span>
                <select
                  value={drilldownPageSize}
                  onChange={(event) =>
                    setDrilldownPageSize(event.target.value as DrilldownPageSize)
                  }
                >
                  {drilldownPageSizeOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button type="button" className="small-button secondary-button" onClick={closeAnalyticsDrilldown}>
              Close
            </button>
          </div>
        }
      />

      {activeDrilldown.clients.length > 0 ? (
        <div className="analytics-drilldown-table-wrap">
          <table className="analytics-drilldown-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Category</th>
                <th>Intake date</th>
                <th>Counseling reasons</th>
                <th>C-SSRS</th>
              </tr>
            </thead>
            <tbody>
              {visibleDrilldownClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <strong>{client.client_name || "Unnamed client"}</strong>
                  </td>
                  <td>{client.status}</td>
                  <td>{client.category_path || "Uncategorized"}</td>
                  <td>{client.intake_date || "Not set"}</td>
                  <td>
                    {client.counselling_reasons.length > 0
                      ? client.counselling_reasons.join(", ")
                      : "None saved"}
                  </td>
                  <td>{client.cssrs_risk_label}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="analytics-drilldown-more">
            {activeDrilldownIsLimited
              ? `Showing ${visibleDrilldownClients.length} of ${activeDrilldown.clients.length} matching clients.`
              : `Showing all ${activeDrilldown.clients.length} matching clients.`}
          </p>
        </div>
      ) : (
        <div className="empty-state">{activeDrilldown.emptyLabel}</div>
      )}
    </section>
  );
}
