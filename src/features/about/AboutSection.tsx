import "./about.css";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { APP_BUILD_INFO, CLINIC_NAME } from "../../appShared";

export type AboutSectionProps = {
  aboutMessage: string;
  handleCheckForUpdates: () => void | Promise<void>;
  isCheckingForUpdates?: boolean;
};

export function AboutSection({
  aboutMessage,
  handleCheckForUpdates,
  isCheckingForUpdates = false,
}: AboutSectionProps) {
  const releaseNotes = [
    "Clinic desktop workspace for client records, C-SSRS screening, 4Ps case conceptualization, progress notes, documents, assessments, analytics, care team access, settings, profile, and audit review.",
    "Automatic update checking is planned for a future release. This build is currently updated manually by the developer.",
  ];

  return (
    <div className="page-content about-page">
      <h2>About</h2>

      <div className="panel about-panel">
        <SectionHeader
          className="about-panel-header"
          contentClassName="about-panel-copy"
          kicker="About"
          title={APP_BUILD_INFO.product_name}
          titleClassName="about-popover-title"
          description={
            <>
              This application was developed exclusively for {CLINIC_NAME} to support the
              clinic&apos;s internal client management workflow.
            </>
          }
          descriptionClassName="about-description"
          actions={
            <div className="about-header-actions">
              <button
                type="button"
                className="small-button secondary-button about-update-button"
                onClick={handleCheckForUpdates}
                disabled={isCheckingForUpdates}
              >
                {isCheckingForUpdates ? "Checking…" : "Check for Updates"}
              </button>
            </div>
          }
        />

        <div className="about-info-list">
          <div className="about-info-row">
            <span className="about-info-label">Version</span>
            <strong className="about-info-value">{APP_BUILD_INFO.version}</strong>
          </div>

          <div className="about-info-row about-info-row-stack">
            <span className="about-info-label">Environment</span>
            <strong className="about-info-value">
              {APP_BUILD_INFO.environment_summary}
            </strong>
          </div>

          <div className="about-info-row about-info-row-stack">
            <span className="about-info-label">Desktop identifier</span>
            <strong className="about-info-value">{APP_BUILD_INFO.identifier}</strong>
          </div>
        </div>

        <div className="about-release-note">
          <strong>Release notes</strong>
          <ul className="about-release-list">
            {releaseNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <StatusMessage className="about-status-message" message={aboutMessage} />
      </div>
    </div>
  );
}
