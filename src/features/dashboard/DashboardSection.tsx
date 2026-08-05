import { StatusMessage } from "../../components/StatusMessage";
import type {
  AnalyticsDrilldownClient,
  ClientListItem,
  ClientTab,
  DashboardAnnouncement,
} from "../../appShared";
import { formatCategoryPath } from "../../appShared";

export type DashboardActivityItem = {
  id: string;
  type: string;
  clientId: string | null;
  clientName: string;
  createdAt: string;
};

export type DashboardAttentionItem = {
  label: string;
  value: number;
  helpText: string;
  clients: AnalyticsDrilldownClient[];
  emptyLabel: string;
  tab: ClientTab;
};

export type DashboardSectionProps = {
  analyticsLoading: boolean;
  analyticsClientCount: number;
  dashboardActiveClientCount: number;
  dashboardNewClientsThisWeekCount: number;
  dashboardRecentActivity: DashboardActivityItem[];
  dashboardNotesThisWeekCount: number;
  dashboardFilesThisWeekCount: number;
  selectedClient: Pick<ClientListItem, "client_name" | "category_path" | "client_status"> | null;
  selectedClientId: string;
  openSelectedClientFromDashboard: (tab?: ClientTab) => void;
  shouldShowDashboardAnnouncement: boolean;
  dashboardAnnouncement: DashboardAnnouncement;
  announcementSignature: string;
  handleDismissDashboardAnnouncement: (signature: string) => void;
  dashboardAnnouncementExpiryLabel: string;
  dashboardAttentionItems: DashboardAttentionItem[];
  openClientFromDashboard: (clientId: string, tab?: ClientTab) => void;
  formatDashboardDateLabel: (value: string | null | undefined) => string;
  clientMessage: string;
  notesMessage: string;
  documentsMessage: string;
  assessmentsMessage: string;
  analyticsMessage: string;
};

const getRecentActivityClientTab = (type: string): ClientTab => {
  if (type === "Progress note added") return "notes";
  if (type === "Document uploaded") return "documents";
  if (type === "Assessment uploaded") return "assessments";
  if (type === "C-SSRS updated") return "cssrs";
  if (type.startsWith("4Ps")) return "fourPs";
  return "overview";
};

export function DashboardSection({
  analyticsLoading,
  analyticsClientCount,
  dashboardActiveClientCount,
  dashboardNewClientsThisWeekCount,
  dashboardRecentActivity,
  dashboardNotesThisWeekCount,
  dashboardFilesThisWeekCount,
  selectedClient,
  selectedClientId,
  openSelectedClientFromDashboard,
  shouldShowDashboardAnnouncement,
  dashboardAnnouncement,
  announcementSignature,
  handleDismissDashboardAnnouncement,
  dashboardAnnouncementExpiryLabel,
  dashboardAttentionItems,
  openClientFromDashboard,
  formatDashboardDateLabel,
  clientMessage,
  notesMessage,
  documentsMessage,
  assessmentsMessage,
  analyticsMessage,
}: DashboardSectionProps) {
  const renderDashboardClientLinks = (
    clients: AnalyticsDrilldownClient[],
    emptyLabel: string,
    tab: ClientTab
  ) => {
    if (clients.length === 0) {
      return <p className="dashboard-empty-state">{emptyLabel}</p>;
    }

    const visibleClients = clients.slice(0, 4);
    const remainingCount = clients.length - visibleClients.length;

    return (
      <div className="dashboard-attention-list">
        {visibleClients.map((client) => (
          <button
            key={client.id}
            type="button"
            className="dashboard-client-link"
            onClick={() => openClientFromDashboard(client.id, tab)}
          >
            <span>{client.client_name?.trim() || "Unnamed client"}</span>
            <small>{client.category_path || "Uncategorized"}</small>
          </button>
        ))}

        {remainingCount > 0 && (
          <p className="dashboard-list-more">
            +{remainingCount.toLocaleString()} more in Analytics
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="page-content dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Daily clinic snapshot, follow-up priorities, and recent work.</p>
        </div>

        {analyticsLoading && <span className="dashboard-loading-pill">Refreshing dashboard…</span>}
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Quick Snapshot</h3>
            <p>Client count, latest activity, and the currently selected client.</p>
          </div>
        </div>

        <div className="dashboard-snapshot-grid dashboard-overview-grid">
          <article className="info-card dashboard-snapshot-card">
            <span>Total Clients</span>
            <strong>{analyticsClientCount.toLocaleString()}</strong>
            <small>
              {dashboardActiveClientCount.toLocaleString()} active •{" "}
              {dashboardNewClientsThisWeekCount.toLocaleString()} new this week
            </small>
          </article>

          <article className="info-card dashboard-snapshot-card">
            <span>Recent Activity</span>
            <strong>{dashboardRecentActivity.length.toLocaleString()}</strong>
            <small>
              {dashboardNotesThisWeekCount.toLocaleString()} notes •{" "}
              {dashboardFilesThisWeekCount.toLocaleString()} files this week
            </small>
          </article>

          <article className="info-card dashboard-snapshot-card dashboard-last-viewed-snapshot-card">
            <span>Last Viewed Client</span>
            <strong>{selectedClient?.client_name ?? "None"}</strong>
            <small>Continue from the client currently selected in the app.</small>
            <small>
              {selectedClient
                ? `${formatCategoryPath(selectedClient.category_path ?? "") || "Uncategorized"} • ${
                    selectedClient.client_status ?? "Active"
                  }`
                : "Select a client to continue"}
            </small>
            <div className="dashboard-snapshot-actions">
              <button
                type="button"
                className="small-button"
                onClick={() => openSelectedClientFromDashboard("overview")}
                disabled={!selectedClientId}
              >
                Open client
              </button>
              <button
                type="button"
                className="small-button"
                onClick={() => openSelectedClientFromDashboard("notes")}
                disabled={!selectedClientId}
              >
                + Add note
              </button>
            </div>
          </article>
        </div>
      </section>

      {shouldShowDashboardAnnouncement && (
        <section
          className={`panel dashboard-announcement-banner dashboard-announcement-${dashboardAnnouncement.priority.toLowerCase()}`}
        >
          <div className="dashboard-announcement-top">
            <div className="dashboard-announcement-copy">
              <span className="dashboard-announcement-badge">
                {dashboardAnnouncement.priority}
              </span>
              <p className="dashboard-announcement-message">
                {dashboardAnnouncement.message}
              </p>
            </div>

            {dashboardAnnouncement.show_until_dismissed && (
              <button
                type="button"
                className="small-button dashboard-announcement-action"
                onClick={() => handleDismissDashboardAnnouncement(announcementSignature)}
              >
                Dismiss
              </button>
            )}
          </div>

          <div className="dashboard-announcement-meta">
            <span>Expires: {dashboardAnnouncementExpiryLabel}</span>
            {dashboardAnnouncement.show_until_dismissed && (
              <span>Visible until dismissed on this device</span>
            )}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Needs Attention</h3>
            <p>Priority follow-up checks for client records.</p>
          </div>
        </div>

        <div className="dashboard-attention-grid">
          {dashboardAttentionItems.map((item) => (
            <article className="panel dashboard-attention-card" key={item.label}>
              <div className="dashboard-attention-card-header">
                <div>
                  <h4>{item.label}</h4>
                  {item.helpText ? <p>{item.helpText}</p> : null}
                </div>
                <strong>{item.value.toLocaleString()}</strong>
              </div>

              {renderDashboardClientLinks(item.clients, item.emptyLabel, item.tab)}
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <article className="panel dashboard-activity-panel dashboard-recent-work-panel">
          <div className="dashboard-section-heading">
            <div>
              <h3>Recent Work</h3>
              <p>5 latest client/documentation updates.</p>
            </div>
          </div>

          {dashboardRecentActivity.length === 0 ? (
            <p className="dashboard-empty-state">No recent work yet.</p>
          ) : (
            <ol className="dashboard-activity-timeline">
              {dashboardRecentActivity.map((item) => (
                <li key={item.id}>
                  <span className="dashboard-activity-marker" aria-hidden="true" />
                  <div className="dashboard-activity-copy">
                    <strong>{item.type}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        item.clientId
                          ? openClientFromDashboard(
                              item.clientId,
                              getRecentActivityClientTab(item.type)
                            )
                          : undefined
                      }
                      disabled={!item.clientId}
                    >
                      {item.clientName}
                    </button>
                    <small>{formatDashboardDateLabel(item.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <StatusMessage
        className="dashboard-status-message"
        message={clientMessage || notesMessage || documentsMessage || assessmentsMessage}
      />

      {!analyticsLoading && (
        <StatusMessage className="dashboard-status-message" message={analyticsMessage} />
      )}
    </div>
  );
}
