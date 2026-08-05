import { StatusMessage } from "../../components/StatusMessage";

type AnalyticsExportControlsProps = {
  analyticsLoading: boolean;
  isCsvExporting: boolean;
  isAnalyticsExporting: boolean;
  canOpenClientLevelAnalytics: boolean;
  analyticsExportStatus: string;
  onCsvExport: () => void | Promise<void>;
  onPresentationExport: () => void | Promise<void>;
};

export function AnalyticsExportControls({
  analyticsLoading,
  isCsvExporting,
  isAnalyticsExporting,
  canOpenClientLevelAnalytics,
  analyticsExportStatus,
  onCsvExport,
  onPresentationExport,
}: AnalyticsExportControlsProps) {
  return (
    <>
      <div className="analytics-export-button-row">
        <button
          type="button"
          className="small-button secondary-button analytics-export-button"
          onClick={() => {
            void onCsvExport();
          }}
          disabled={analyticsLoading || isCsvExporting || !canOpenClientLevelAnalytics}
        >
          <svg viewBox="0 0 24 24" className="analytics-export-button-icon" aria-hidden="true">
            <path
              d="M6 4h12v16H6V4Zm3 4h6M9 12h6M9 16h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{isCsvExporting ? "Generating..." : "Export CSV"}</span>
        </button>

        <button
          type="button"
          className="small-button analytics-export-button"
          onClick={() => {
            void onPresentationExport();
          }}
          disabled={analyticsLoading || isAnalyticsExporting}
        >
          <svg viewBox="0 0 24 24" className="analytics-export-button-icon" aria-hidden="true">
            <path
              d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M6 16.5h12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{isAnalyticsExporting ? "Generating..." : "Export Presentation"}</span>
        </button>
      </div>

      <StatusMessage
        className="analytics-export-status"
        message={analyticsExportStatus}
      />
    </>
  );
}
