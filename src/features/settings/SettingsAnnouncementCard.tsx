import { StatusMessage } from "../../components/StatusMessage";
import { SectionHeader } from "../../components/SectionHeader";
import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  AnnouncementPriority,
  DashboardAnnouncement,
} from "../../appShared";
import { formatAuditTimestamp } from "../../appShared";

type SettingsAnnouncementCardProps = {
  canManageDashboardAnnouncements: boolean;
  dashboardAnnouncement: DashboardAnnouncement;
  setDashboardAnnouncement: Dispatch<SetStateAction<DashboardAnnouncement>>;
  dashboardAnnouncementStatus: string;
  canManageLoading: boolean;
  handleSaveDashboardAnnouncement: () => void | Promise<void>;
  handleClearDashboardAnnouncement: () => void | Promise<void>;
};

const formatAnnouncementDate = (value: string) => {
  if (!value) return "No expiry date";

  const parsed = new Date(`${value}T00:00:00`);

  if (!Number.isFinite(parsed.getTime())) {
    return "Invalid expiry date";
  }

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function SettingsAnnouncementCard({
  canManageDashboardAnnouncements,
  dashboardAnnouncement,
  setDashboardAnnouncement,
  dashboardAnnouncementStatus,
  canManageLoading,
  handleSaveDashboardAnnouncement,
  handleClearDashboardAnnouncement,
}: SettingsAnnouncementCardProps) {
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
  const trimmedMessage = dashboardAnnouncement.message.trim();
  const hasPublishedAnnouncement = Boolean(dashboardAnnouncement.id);
  const hasDraftMessage = trimmedMessage.length > 0;
  const previewMessage =
    trimmedMessage ||
    "Your dashboard notice preview will appear here before publishing.";
  const lastUpdatedLabel = dashboardAnnouncement.updated_at
    ? formatAuditTimestamp(dashboardAnnouncement.updated_at)
    : "Not published yet";
  const activeStateLabel =
    dashboardAnnouncement.is_active && hasPublishedAnnouncement ? "Active" : "Not active";

  const handleDisableRequested = () => {
    if (!hasPublishedAnnouncement && !hasDraftMessage) {
      void handleClearDashboardAnnouncement();
      return;
    }

    setIsDisableConfirmOpen(true);
  };

  const handleConfirmDisable = async () => {
    setIsDisableConfirmOpen(false);
    await handleClearDashboardAnnouncement();
  };

  return (
    <section className="settings-module-card settings-module-card-wide">
      <SectionHeader
        className="settings-module-header"
        kicker="Dashboard announcement"
        title="Clinic notice banner"
        titleClassName="settings-module-title"
        actions={
          <span className={dashboardAnnouncement.is_active ? "settings-module-badge live" : "settings-module-badge pending"}>
            {activeStateLabel}
          </span>
        }
      />

      <p className="settings-module-copy">
        Set one shared dashboard banner for reminders, closures, and urgent workflow
        notices. Publishing and disabling announcements is available to Admin, CEO, and Staff accounts.
      </p>

      {canManageDashboardAnnouncements ? (
        <div className="settings-announcement-form">
          <label className="form-label">
            Announcement message
            <textarea
              className="textarea-input settings-announcement-textarea"
              value={dashboardAnnouncement.message}
              onChange={(event) => {
                setDashboardAnnouncement((current) => ({
                  ...current,
                  message: event.target.value,
                }));
              }}
              placeholder="Write the dashboard announcement here."
              disabled={canManageLoading}
            />
          </label>

          <div className="settings-announcement-grid">
            <label className="form-label">
              Priority
              <select
                value={dashboardAnnouncement.priority}
                onChange={(event) => {
                  const nextPriority = event.target.value as AnnouncementPriority;
                  setDashboardAnnouncement((current) => ({
                    ...current,
                    priority: nextPriority,
                  }));
                }}
                disabled={canManageLoading}
              >
                <option value="Info">Info</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>

            <label className="form-label">
              Expiry date
              <input
                type="date"
                value={dashboardAnnouncement.expiry_date}
                onChange={(event) => {
                  setDashboardAnnouncement((current) => ({
                    ...current,
                    expiry_date: event.target.value,
                  }));
                }}
                disabled={canManageLoading}
              />
            </label>
          </div>

          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={dashboardAnnouncement.show_until_dismissed}
              onChange={(event) => {
                setDashboardAnnouncement((current) => ({
                  ...current,
                  show_until_dismissed: event.target.checked,
                }));
              }}
              disabled={canManageLoading}
            />
            <span>
              <strong>Show until dismissed</strong>
              <small>
                Allow staff to hide the banner on their own device after they have seen it.
              </small>
            </span>
          </label>

          <div
            className={`settings-announcement-preview dashboard-announcement-banner dashboard-announcement-${dashboardAnnouncement.priority.toLowerCase()}`}
            aria-label="Dashboard announcement preview"
          >
            <div className="dashboard-announcement-copy">
              <span className="dashboard-announcement-badge">
                {dashboardAnnouncement.priority}
              </span>
              <p className="dashboard-announcement-message">{previewMessage}</p>
            </div>

            <div className="dashboard-announcement-meta settings-announcement-preview-meta">
              <span>Appears on: Dashboard</span>
              <span>Expires: {formatAnnouncementDate(dashboardAnnouncement.expiry_date)}</span>
              <span>
                Dismissal: {dashboardAnnouncement.show_until_dismissed ? "Per device" : "Always visible until disabled"}
              </span>
            </div>
          </div>

          <div className="settings-announcement-details">
            <div>
              <span className="client-meta-label">Current state</span>
              <strong>{activeStateLabel}</strong>
            </div>
            <div>
              <span className="client-meta-label">Last updated</span>
              <strong>{lastUpdatedLabel}</strong>
            </div>
            <div>
              <span className="client-meta-label">Expiry</span>
              <strong>{formatAnnouncementDate(dashboardAnnouncement.expiry_date)}</strong>
            </div>
          </div>

          <div className="settings-announcement-actions">
            <button
              type="button"
              className="small-button"
              onClick={() => void handleSaveDashboardAnnouncement()}
              disabled={canManageLoading || !hasDraftMessage}
            >
              {canManageLoading ? "Working..." : "Publish notice"}
            </button>

            <button
              type="button"
              className="small-button settings-announcement-secondary-button"
              onClick={handleDisableRequested}
              disabled={canManageLoading}
            >
              Disable notice
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          Only Admin, CEO, or Staff accounts can publish or disable dashboard announcements.
        </div>
      )}

      <StatusMessage
        className="settings-announcement-status"
        message={
          dashboardAnnouncementStatus ||
          (canManageDashboardAnnouncements
            ? "Announcements are shared across the clinic. Dismissing an announcement only hides it on this device."
            : "Active announcements still appear on the Dashboard for all signed-in staff.")
        }
        tone={dashboardAnnouncementStatus ? undefined : "info"}
      />

      {isDisableConfirmOpen ? (
        <div className="settings-confirm-overlay" role="presentation">
          <div
            className="settings-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-disable-announcement-title"
          >
            <h4 id="settings-disable-announcement-title">Disable clinic notice?</h4>
            <p>
              This will remove the current banner from the Dashboard for all staff. The notice can
              be published again later.
            </p>

            <div className="settings-confirm-actions">
              <button
                type="button"
                className="small-button settings-confirm-secondary"
                onClick={() => setIsDisableConfirmOpen(false)}
              >
                No, keep it
              </button>
              <button
                type="button"
                className="small-button settings-confirm-danger"
                onClick={() => void handleConfirmDisable()}
              >
                Yes, disable it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
