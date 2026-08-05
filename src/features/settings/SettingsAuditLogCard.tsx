import { StatusMessage } from "../../components/StatusMessage";
import { SectionHeader } from "../../components/SectionHeader";
import { useMemo, useState } from "react";
import type { AuditLogEntry, AuditLogFilterRange } from "../../appShared";
import {
  AUDIT_LOG_FILTER_OPTIONS,
  AUDIT_LOG_PAGE_SIZE,
  formatAuditDetails,
  formatAuditTimestamp,
  getAuditTargetLabel,
} from "../../appShared";

type SettingsAuditLogCardProps = {
  canManageCareTeam: boolean;
  auditLogFilter: AuditLogFilterRange;
  setAuditLogFilter: (filter: AuditLogFilterRange) => void;
  isAuditLogLoading: boolean;
  auditLogEntries: AuditLogEntry[];
  auditLogStatus: string;
  handleRefreshAuditLogs: () => void | Promise<void>;
};

const normalizeSearchText = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

const getAuditEntrySearchText = (entry: AuditLogEntry) =>
  [
    entry.module,
    entry.action,
    entry.actor_name,
    entry.actor_email,
    entry.target_type,
    entry.target_label,
    formatAuditDetails(entry.details),
  ]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
    .join(" ");

export function SettingsAuditLogCard({
  canManageCareTeam,
  auditLogFilter,
  setAuditLogFilter,
  isAuditLogLoading,
  auditLogEntries,
  auditLogStatus,
  handleRefreshAuditLogs,
}: SettingsAuditLogCardProps) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>();

    auditLogEntries.forEach((entry) => {
      if (entry.module.trim()) {
        modules.add(entry.module.trim());
      }
    });

    return Array.from(modules).sort((first, second) => first.localeCompare(second));
  }, [auditLogEntries]);

  const filteredAuditLogEntries = useMemo(() => {
    const normalizedSearch = normalizeSearchText(auditSearch);

    return auditLogEntries.filter((entry) => {
      const matchesModule = moduleFilter === "all" || entry.module === moduleFilter;
      const matchesSearch =
        normalizedSearch === "" || getAuditEntrySearchText(entry).includes(normalizedSearch);

      return matchesModule && matchesSearch;
    });
  }, [auditLogEntries, auditSearch, moduleFilter]);

  return (
    <section className="settings-module-card settings-module-card-wide">
      <SectionHeader
        className="settings-module-header"
        kicker="System oversight"
        title="System Activity / Audit Log"
        titleClassName="settings-module-title"
        actions={<span className="settings-module-badge live">Live</span>}
      />

      <p className="settings-module-copy">
        Review real audit log records from the database.
      </p>

      {canManageCareTeam ? (
        <>
          <div className="settings-audit-toolbar">
            <div className="settings-audit-filter-row" role="tablist" aria-label="Audit log range">
              {AUDIT_LOG_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-audit-filter-button ${
                    auditLogFilter === option.value ? "active" : ""
                  }`}
                  onClick={() => setAuditLogFilter(option.value)}
                  disabled={isAuditLogLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="small-button settings-audit-refresh-button"
              onClick={() => void handleRefreshAuditLogs()}
              disabled={isAuditLogLoading}
            >
              {isAuditLogLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="settings-audit-refine-row">
            <label className="settings-audit-refine-control">
              <span>Module</span>
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                disabled={isAuditLogLoading}
              >
                <option value="all">All modules</option>
                {moduleOptions.map((moduleName) => (
                  <option key={moduleName} value={moduleName}>
                    {moduleName}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-audit-refine-control settings-audit-search-control">
              <span>Search activity</span>
              <input
                type="search"
                className="search-input"
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
                placeholder="Search actor, target, action, or details"
                disabled={isAuditLogLoading}
              />
            </label>

            <div className="settings-audit-toolbar-copy">
              <span>
                Showing {filteredAuditLogEntries.length.toLocaleString()} of{" "}
                {auditLogEntries.length.toLocaleString()} loaded entries · newest first
              </span>
              <span>Limit: {AUDIT_LOG_PAGE_SIZE} entries</span>
            </div>
          </div>

          {isAuditLogLoading ? (
            <div className="empty-state">Loading system activity...</div>
          ) : filteredAuditLogEntries.length > 0 ? (
            <div className="settings-audit-log">
              {filteredAuditLogEntries.map((entry) => (
                <article key={entry.id} className="settings-audit-entry">
                  <div className="settings-audit-entry-top">
                    <div className="settings-audit-entry-heading">
                      <span className="settings-audit-entry-module">{entry.module}</span>
                      <strong className="settings-audit-entry-title">
                        {entry.action} · {getAuditTargetLabel(entry)}
                      </strong>
                      <span className="settings-audit-entry-actor">
                        {entry.actor_name?.trim() || entry.actor_email?.trim() || "Unknown user"}
                      </span>
                    </div>

                    <span className="settings-audit-entry-time">
                      {formatAuditTimestamp(entry.created_at)}
                    </span>
                  </div>

                  <p className="settings-audit-entry-details">
                    {formatAuditDetails(entry.details)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No activity records match the selected filters yet.</div>
          )}

          <StatusMessage
            className="settings-module-inline-note"
            message={auditLogStatus}
          />
        </>
      ) : (
        <div className="empty-state">
          Only Admin can review system activity.
        </div>
      )}

      <p className="settings-module-inline-note">
        This panel reads from the audit_logs table and keeps the review focused with time,
        module, and text filters.
      </p>
    </section>
  );
}
