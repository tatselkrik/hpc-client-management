import { StatusMessage } from "../../components/StatusMessage";
import { AnalyticsIcon, ClientsIcon } from "../../components/icons";
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

const getAttentionTone = (label: string) => {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("suicide") || normalizedLabel.includes("c-ssrs")) {
    return "critical";
  }

  if (normalizedLabel.includes("progress") || normalizedLabel.includes("note")) {
    return "warning";
  }

  if (normalizedLabel.includes("4ps") || normalizedLabel.includes("narrative")) {
    return "warm";
  }

  return "neutral";
};

const dashboardDateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

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
  const attentionTotal = dashboardAttentionItems.reduce((total, item) => total + item.value, 0);

  const renderDashboardClientLinks = (
    clients: AnalyticsDrilldownClient[],
    emptyLabel: string,
    tab: ClientTab
  ) => {
    if (clients.length === 0) {
      return (
        <p className="dashboard-empty-state dashboard-attention-empty">
          <span aria-hidden="true">✓</span>
          {emptyLabel}
        </p>
      );
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
            <span className="dashboard-client-link-copy">
              <strong>{client.client_name?.trim() || "Unnamed client"}</strong>
              <small>{client.category_path || "Uncategorized"}</small>
            </span>
            <span className="dashboard-client-link-arrow" aria-hidden="true">→</span>
          </button>
        ))}

        {remainingCount > 0 && (
          <p className="dashboard-list-more">
            +{remainingCount.toLocaleString()} more available in Analytics
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="page-content dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Clinic operations</span>
          <h2>Dashboard</h2>
          <p>A focused view of the caseload, follow-up priorities, and latest work.</p>
        </div>

        <div className="dashboard-today-card">
          <span>Today</span>
          <strong>{dashboardDateLabel}</strong>
          {analyticsLoading ? (
            <small className="dashboard-refresh-state">
              <span aria-hidden="true" /> Refreshing clinic data
            </small>
          ) : (
            <small>Clinic workspace overview</small>
          )}
        </div>
      </header>

      <section className="dashboard-snapshot-grid" aria-label="Clinic snapshot">
        <article className="info-card dashboard-snapshot-card dashboard-snapshot-caseload">
          <div className="dashboard-snapshot-topline">
            <span className="dashboard-snapshot-icon" aria-hidden="true">
              <ClientsIcon className="dashboard-card-icon" />
            </span>
            <span className="dashboard-snapshot-label">Caseload</span>
          </div>
          <div className="dashboard-snapshot-value-row">
            <strong>{analyticsClientCount.toLocaleString()}</strong>
            <span>Total clients</span>
          </div>
          <div className="dashboard-snapshot-meta">
            <span>{dashboardActiveClientCount.toLocaleString()} active</span>
            <span>{dashboardNewClientsThisWeekCount.toLocaleString()} new this week</span>
          </div>
        </article>

        <article className="info-card dashboard-snapshot-card dashboard-snapshot-work">
          <div className="dashboard-snapshot-topline">
            <span className="dashboard-snapshot-icon" aria-hidden="true">
              <AnalyticsIcon className="dashboard-card-icon" />
            </span>
            <span className="dashboard-snapshot-label">Documentation</span>
          </div>
          <div className="dashboard-snapshot-value-row">
            <strong>{dashboardRecentActivity.length.toLocaleString()}</strong>
            <span>Recent updates</span>
          </div>
          <div className="dashboard-snapshot-meta">
            <span>{dashboardNotesThisWeekCount.toLocaleString()} notes</span>
            <span>{dashboardFilesThisWeekCount.toLocaleString()} files this week</span>
          </div>
        </article>

        <article className="info-card dashboard-snapshot-card dashboard-continue-card">
          <div className="dashboard-snapshot-topline">
            <span className="dashboard-continue-kicker">Continue care</span>
            {selectedClient ? <span className="dashboard-client-status">{selectedClient.client_status ?? "Active"}</span> : null}
          </div>
          <strong className="dashboard-selected-client-name">
            {selectedClient?.client_name ?? "No client selected"}
          </strong>
          <p>
            {selectedClient
              ? formatCategoryPath(selectedClient.category_path ?? "") || "Uncategorized"
              : "Select a client to make their workspace available here."}
          </p>
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
              className="secondary-button"
              onClick={() => openSelectedClientFromDashboard("notes")}
              disabled={!selectedClientId}
            >
              Add note
            </button>
          </div>
        </article>
      </section>

      {shouldShowDashboardAnnouncement && (
        <section
          className={`dashboard-announcement-banner dashboard-announcement-${dashboardAnnouncement.priority.toLowerCase()}`}
        >
          <div className="dashboard-announcement-symbol" aria-hidden="true">!</div>
          <div className="dashboard-announcement-body">
            <div className="dashboard-announcement-copy">
              <span className="dashboard-announcement-badge">{dashboardAnnouncement.priority}</span>
              <p className="dashboard-announcement-message">{dashboardAnnouncement.message}</p>
            </div>
            <div className="dashboard-announcement-meta">
              <span>Expires {dashboardAnnouncementExpiryLabel}</span>
              {dashboardAnnouncement.show_until_dismissed && (
                <span>Visible until dismissed on this device</span>
              )}
            </div>
          </div>

          {dashboardAnnouncement.show_until_dismissed && (
            <button
              type="button"
              className="secondary-button dashboard-announcement-action"
              onClick={() => handleDismissDashboardAnnouncement(announcementSignature)}
            >
              Dismiss
            </button>
          )}
        </section>
      )}

      <div className="dashboard-workspace-grid">
        <section className="panel dashboard-priorities-panel">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-kicker">Care priorities</span>
              <h3>Needs attention</h3>
              <p>Follow-up checks drawn from the records you can access.</p>
            </div>
            <span className="dashboard-priority-total">
              <strong>{attentionTotal.toLocaleString()}</strong>
              <small>open checks</small>
            </span>
          </div>

          <div className="dashboard-priority-list">
            {dashboardAttentionItems.map((item) => {
              const tone = getAttentionTone(item.label);

              return (
                <article className={`dashboard-attention-row dashboard-attention-${tone}`} key={item.label}>
                  <div className="dashboard-attention-summary">
                    <span className="dashboard-attention-indicator" aria-hidden="true" />
                    <div>
                      <h4>{item.label}</h4>
                      {item.helpText ? <p>{item.helpText}</p> : null}
                    </div>
                    <strong className="dashboard-attention-count">{item.value.toLocaleString()}</strong>
                  </div>
                  {renderDashboardClientLinks(item.clients, item.emptyLabel, item.tab)}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel dashboard-activity-panel">
          <div className="dashboard-section-heading dashboard-activity-heading">
            <div>
              <span className="dashboard-section-kicker">Activity</span>
              <h3>Recent work</h3>
              <p>The five latest client and documentation updates.</p>
            </div>
          </div>

          {dashboardRecentActivity.length === 0 ? (
            <p className="dashboard-empty-state dashboard-activity-empty">No recent work yet.</p>
          ) : (
            <ol className="dashboard-activity-timeline">
              {dashboardRecentActivity.map((item) => (
                <li key={item.id}>
                  <span className="dashboard-activity-marker" aria-hidden="true" />
                  <div className="dashboard-activity-copy">
                    <span className="dashboard-activity-type">{item.type}</span>
                    <button
                      type="button"
                      onClick={() =>
                        item.clientId
                          ? openClientFromDashboard(item.clientId, getRecentActivityClientTab(item.type))
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
        </section>
      </div>

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
