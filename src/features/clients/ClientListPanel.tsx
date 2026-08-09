import type { Dispatch, RefObject, SetStateAction } from "react";

import type { ClientListItem, ClientTab, ClientStatus, SortMode } from "../../appShared";
import { formatCategoryPath } from "../../appShared";
import { SortIcon } from "../../components/icons";

type ClientListPanelClient = ClientListItem & {
  status: ClientStatus;
  category_path: string;
};

type ClientListPanelProps = {
  filteredClientSummary: {
    total: number;
    active: number;
    terminated: number;
  };
  clientSort: SortMode;
  setClientSort: (value: SortMode) => void;
  isClientSortMenuOpen: boolean;
  setIsClientSortMenuOpen: Dispatch<SetStateAction<boolean>>;
  clientSortMenuRef: RefObject<HTMLDivElement | null>;
  groupedClients: Array<{
    label: string;
    clients: ClientListPanelClient[];
  }>;
  selectedClientId: string;
  setSelectedClientId: (clientId: string) => void;
  setActiveClientTab: (tab: ClientTab) => void;
};

const sortLabel = (value: SortMode) => {
  if (value === "alphabetical") return "Alphabetical";
  if (value === "last_created") return "Last created";
  return "Last modified";
};

const getClientInitial = (name: string | null | undefined) =>
  name?.trim().charAt(0).toUpperCase() || "C";

export function ClientListPanel({
  filteredClientSummary,
  clientSort,
  setClientSort,
  isClientSortMenuOpen,
  setIsClientSortMenuOpen,
  clientSortMenuRef,
  groupedClients,
  selectedClientId,
  setSelectedClientId,
  setActiveClientTab,
}: ClientListPanelProps) {
  return (
    <div className="clients-sidebar">
      <div className="clients-list-header">
        <div className="clients-list-header-left">
          <span className="clients-list-kicker">Directory</span>
          <h3>Client list</h3>
          <p className="clients-record-summary">
            <span>
              {filteredClientSummary.total} record
              {filteredClientSummary.total === 1 ? "" : "s"}
            </span>
            <span className="summary-pill summary-pill-active">
              {filteredClientSummary.active} Active
            </span>
            <span className="summary-pill summary-pill-terminated">
              {filteredClientSummary.terminated} Terminated
            </span>
          </p>
        </div>

        <div className="clients-list-tools" ref={clientSortMenuRef}>
          <div className="sort-dropdown">
            <button
              type="button"
              className="secondary-button clients-sort-button"
              onClick={() => setIsClientSortMenuOpen((value) => !value)}
              title={`Sort: ${sortLabel(clientSort)}`}
              aria-label={`Sort: ${sortLabel(clientSort)}`}
            >
              <SortIcon />
              <span>{sortLabel(clientSort)}</span>
            </button>

            {isClientSortMenuOpen && (
              <div className="sort-dropdown-menu">
                <button
                  type="button"
                  className={`sort-option ${clientSort === "alphabetical" ? "active" : ""}`}
                  onClick={() => {
                    setClientSort("alphabetical");
                    setIsClientSortMenuOpen(false);
                  }}
                >
                  Name
                </button>
                <button
                  type="button"
                  className={`sort-option ${clientSort === "last_created" ? "active" : ""}`}
                  onClick={() => {
                    setClientSort("last_created");
                    setIsClientSortMenuOpen(false);
                  }}
                >
                  Last Created
                </button>
                <button
                  type="button"
                  className={`sort-option ${clientSort === "last_modified" ? "active" : ""}`}
                  onClick={() => {
                    setClientSort("last_modified");
                    setIsClientSortMenuOpen(false);
                  }}
                >
                  Last Modified
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="client-list">
        {groupedClients.length === 0 ? (
          <div className="empty-state">No clients found.</div>
        ) : (
          groupedClients.map((group) => (
            <div key={group.label} className="client-group">
              <div className="client-group-label">
                <span>{group.label}</span>
                <small>({group.clients.length})</small>
              </div>

              <div className="client-group-items">
                {group.clients.map((client) => (
                  <button
                    key={client.id}
                    className={`client-list-item ${
                      selectedClientId === client.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setActiveClientTab("overview");
                    }}
                  >
                    <div className="client-list-item-top">
                      <div className="client-list-identity">
                        <span className="client-list-avatar" aria-hidden="true">
                          {getClientInitial(client.client_name)}
                        </span>
                        <div className="client-list-identity-copy">
                          <div className="client-list-name">
                            {client.client_name || "Unnamed Client"}
                          </div>
                          <div className="client-list-category">
                            {formatCategoryPath(client.category_path)}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`status-pill ${
                          client.status === "Terminated" ? "terminated" : "active"
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>

                    <small>
                      Updated: {new Date(client.updated_at).toLocaleDateString()}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
