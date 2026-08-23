import "./about.css";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { APP_BUILD_INFO, CLINIC_NAME } from "../../appShared";
import { APP_RELEASE_NOTES, APP_RELEASE_NOTES_VERSION } from "../../releaseNotes";
import type { AvailableAppUpdate } from "./useAboutUpdates";

export type AboutSectionProps = {
  aboutMessage: string;
  handleCheckForUpdates: () => void | Promise<void>;
  availableUpdate: AvailableAppUpdate | null;
  handleInstallAvailableUpdate: () => void | Promise<void>;
  isCheckingForUpdates?: boolean;
  isInstallingUpdate?: boolean;
};

export function AboutSection({
  aboutMessage,
  handleCheckForUpdates,
  availableUpdate,
  handleInstallAvailableUpdate,
  isCheckingForUpdates = false,
  isInstallingUpdate = false,
}: AboutSectionProps) {
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
              disabled={isCheckingForUpdates || isInstallingUpdate}
            >
              {isCheckingForUpdates ? "Checking…" : "Check for Updates"}
            </button>
            {availableUpdate && (availableUpdate.installable || availableUpdate.url) && (
              <button
                type="button"
                className="small-button about-update-download-button"
                onClick={handleInstallAvailableUpdate}
                disabled={isInstallingUpdate}
              >
                {isInstallingUpdate
                  ? "Installing update…"
                  : availableUpdate.installable
                    ? `Update to ${availableUpdate.version}`
                    : `Open version ${availableUpdate.version}`}
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
          <strong>Release notes for version {APP_RELEASE_NOTES_VERSION}</strong>
          <ul className="about-release-list">
            {APP_RELEASE_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <StatusMessage className="about-status-message" message={aboutMessage} />
      </div>
    </div>
  );
}
