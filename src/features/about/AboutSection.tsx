import "./about.css";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { APP_BUILD_INFO, CLINIC_NAME } from "../../appShared";
import type { AvailableAppUpdate } from "./useAboutUpdates";

export type AboutSectionProps = {
  aboutMessage: string;
  handleCheckForUpdates: () => void | Promise<void>;
  availableUpdate: AvailableAppUpdate | null;
  handleOpenAvailableUpdate: () => void | Promise<void>;
  isCheckingForUpdates?: boolean;
};

export function AboutSection({
  aboutMessage,
  handleCheckForUpdates,
  availableUpdate,
  handleOpenAvailableUpdate,
  isCheckingForUpdates = false,
}: AboutSectionProps) {
  const releaseNotes = [
    "Clinic desktop workspace for client records, C-SSRS screening, 4Ps case conceptualization, progress notes, documents, assessments, analytics, care team access, settings, profile, and audit review.",
    "Secure release-channel update checking is available from this page. Installation remains a deliberate user action.",
  ];

  return (
    <div className="page-content about-page">
      <WorkspaceHeader
        eyebrow="Application information"
        title="About"
        description="Review the installed release, update channel, and the purpose of this clinic workspace."
        meta={
          <>
            <strong>Version {APP_BUILD_INFO.version}</strong>
            <span>{APP_BUILD_INFO.channel} release channel</span>
          </>
        }
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
            {availableUpdate?.url && (
              <button
                type="button"
                className="small-button about-update-download-button"
                onClick={handleOpenAvailableUpdate}
              >
                Open version {availableUpdate.version}
              </button>
            )}
          </div>
        }
      />

      <div className="panel about-panel">
        <SectionHeader
          className="about-panel-header"
          contentClassName="about-panel-copy"
          kicker="Clinic desktop workspace"
          title={APP_BUILD_INFO.product_name}
          titleClassName="about-popover-title"
          description={
            <>
              This application was developed exclusively for {CLINIC_NAME} to support the
              clinic&apos;s internal client management workflow.
            </>
          }
          descriptionClassName="about-description"
        />

        <div className="about-info-list">
          <div className="about-info-row">
            <span className="about-info-label">Version</span>
            <strong className="about-info-value">{APP_BUILD_INFO.version}</strong>
          </div>

          <div className="about-info-row about-info-row-stack">
            <span className="about-info-label">Release channel</span>
            <strong className="about-info-value">{APP_BUILD_INFO.channel}</strong>
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
