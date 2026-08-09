import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import { useState } from "react";

import type {
  ClientListItem,
  ClientStatus,
  ClientTab,
  SortMode,
} from "../../appShared";
import {
  CLIENT_STATUS_OPTIONS,
} from "../../appShared";
import { PlusIcon, SearchIcon } from "../../components/icons";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { ClientListPanel } from "./ClientListPanel";
import { ClientTabContent, type ClientTabContentProps } from "./ClientTabContent";

export type GroupedClient = ClientListItem & {
  status: ClientStatus;
  category_path: string;
};

export type ClientsSectionProps = {
  clientSearch: string;
  setClientSearch: (value: string) => void;
  handleAddClient: (initialRepresentativeName?: string) => Promise<boolean>;
  canCreateClientRecords: boolean;
  hpcRepresentativeOptions: string[];
  requiresNewClientRepresentativeSelection: boolean;
  defaultNewClientRepresentative: string;
  loading: boolean;
  clientStatusFilter: "all" | ClientStatus;
  setClientStatusFilter: (value: "all" | ClientStatus) => void;
  clientCategoryFilter: string;
  setClientCategoryFilter: (value: string) => void;
  availableClientCategories: string[];
  clientYearFilter: string;
  setClientYearFilter: (value: string) => void;
  availableClientYears: string[];
  clientMonthFilter: string;
  setClientMonthFilter: (value: string) => void;
  availableClientMonths: string[];
  filteredClientSummary: {
    total: number;
    active: number;
    terminated: number;
  };
  hasActiveClientFilters: boolean;
  activeClientFilterLabels: string[];
  clearClientFilters: () => void;
  clientSort: SortMode;
  setClientSort: (value: SortMode) => void;
  isClientSortMenuOpen: boolean;
  setIsClientSortMenuOpen: Dispatch<SetStateAction<boolean>>;
  clientSortMenuRef: RefObject<HTMLDivElement | null>;
  groupedClients: Array<{
    label: string;
    clients: GroupedClient[];
  }>;
  selectedClientId: string;
  setSelectedClientId: (clientId: string) => void;
  setActiveClientTab: (tab: ClientTab) => void;
  activeClientTab: ClientTab;
  hasSuicidalIdeation: boolean;
  selectedClient: ClientListItem | null;
  isSelectedClientHiddenByFilters: boolean;
  clientQuickSummary: {
    name: string;
    status: ClientStatus;
    category: string;
    intakeDate: string;
    cssrsStatus: string;
    lastProgressNoteDate: string;
    fileSummary: string;
  } | null;
  clientTabContentProps: ClientTabContentProps;
};

export function ClientsSection({
  clientSearch,
  setClientSearch,
  handleAddClient,
  canCreateClientRecords,
  hpcRepresentativeOptions,
  requiresNewClientRepresentativeSelection,
  defaultNewClientRepresentative,
  loading,
  clientStatusFilter,
  setClientStatusFilter,
  clientCategoryFilter,
  setClientCategoryFilter,
  availableClientCategories,
  clientYearFilter,
  setClientYearFilter,
  availableClientYears,
  clientMonthFilter,
  setClientMonthFilter,
  availableClientMonths,
  filteredClientSummary,
  hasActiveClientFilters,
  activeClientFilterLabels,
  clearClientFilters,
  clientSort,
  setClientSort,
  isClientSortMenuOpen,
  setIsClientSortMenuOpen,
  clientSortMenuRef,
  groupedClients,
  selectedClientId,
  setSelectedClientId,
  setActiveClientTab,
  activeClientTab,
  hasSuicidalIdeation,
  selectedClient,
  isSelectedClientHiddenByFilters,
  clientQuickSummary,
  clientTabContentProps,
}: ClientsSectionProps) {
  const [isNewClientAssignmentOpen, setIsNewClientAssignmentOpen] = useState(false);
  const [newClientRepresentative, setNewClientRepresentative] = useState("");

  const handleRequestAddClient = () => {
    if (requiresNewClientRepresentativeSelection) {
      setNewClientRepresentative("");
      setIsNewClientAssignmentOpen(true);
      return;
    }

    void handleAddClient(defaultNewClientRepresentative);
  };

  const handleConfirmAddClient = async () => {
    const wasCreated = await handleAddClient(newClientRepresentative);

    if (wasCreated) {
      setIsNewClientAssignmentOpen(false);
      setNewClientRepresentative("");
    }
  };

  return (
    <div className="page-content clients-page">
      <WorkspaceHeader
        eyebrow="Client workspace"
        title="Clients"
        description="Find a client, review their record, and continue documentation from one focused workspace."
        meta={
          <>
            <strong>
              {filteredClientSummary.total.toLocaleString()} visible record
              {filteredClientSummary.total === 1 ? "" : "s"}
            </strong>
            <span>
              {filteredClientSummary.active.toLocaleString()} active ·{" "}
              {filteredClientSummary.terminated.toLocaleString()} terminated
            </span>
          </>
        }
      />

      <section className="clients-command-panel" aria-label="Client search and filters">
        <div className="clients-topbar">
          <div className="clients-searchbar">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              className="search-input"
            />
          </div>

          {canCreateClientRecords ? (
            <div className="clients-actions">
              <button
                className="small-button primary-button add-client-button"
                onClick={handleRequestAddClient}
                disabled={loading}
                title="Add a new client"
              >
                <PlusIcon />
                <span>{loading ? "Please wait..." : "Add Client"}</span>
              </button>
            </div>
          ) : null}
        </div>

      {isNewClientAssignmentOpen ? (
        <div className="app-modal-overlay" role="presentation">
          <form
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-client-assignment-title"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmAddClient();
            }}
          >
            <div className="app-modal-header">
              <div>
                <h3 id="new-client-assignment-title">Assign New Client</h3>
                <p className="app-modal-subtitle">
                  Choose the HPC Representative who will receive this client.
                </p>
              </div>
            </div>

            <label className="form-label">
              HPC Representative
              <select
                className="search-input"
                value={newClientRepresentative}
                onChange={(event) => setNewClientRepresentative(event.target.value)}
                required
                autoFocus
              >
                <option value="">Select representative</option>
                {hpcRepresentativeOptions.map((representative) => (
                  <option key={representative} value={representative}>
                    {representative}
                  </option>
                ))}
              </select>
            </label>

            {hpcRepresentativeOptions.length === 0 ? (
              <p className="app-modal-helper">
                No active Admin or Psychologist/Counselor has an HPC Representative name yet.
              </p>
            ) : null}

            <div className="app-modal-actions">
              <button
                type="button"
                className="small-button secondary-button"
                onClick={() => setIsNewClientAssignmentOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="small-button"
                disabled={loading || !newClientRepresentative}
              >
                {loading ? "Creating..." : "Create Client"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

        <div className="clients-filters-row">
        <label className="clients-filter">
          <span>Status</span>
          <select
            className="search-input"
            value={clientStatusFilter}
            onChange={(event) =>
              setClientStatusFilter(event.target.value as "all" | ClientStatus)
            }
          >
            <option value="all">All</option>
            {CLIENT_STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </label>

        <label className="clients-filter">
          <span>Category</span>
          <select
            className="search-input"
            value={clientCategoryFilter}
            onChange={(event) => setClientCategoryFilter(event.target.value)}
          >
            <option value="all">All</option>
            {availableClientCategories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </label>

        <label className="clients-filter">
          <span>Year</span>
          <select
            className="search-input"
            value={clientYearFilter}
            onChange={(event) => setClientYearFilter(event.target.value)}
          >
            <option value="all">All</option>
            {availableClientYears.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </label>

        <label className="clients-filter">
          <span>Month</span>
          <select
            className="search-input"
            value={clientMonthFilter}
            onChange={(event) => setClientMonthFilter(event.target.value)}
          >
            <option value="all">All</option>
            {availableClientMonths.map((monthOption) => (
              <option key={monthOption} value={monthOption}>
                {monthOption}
              </option>
            ))}
          </select>
        </label>
        </div>

        {hasActiveClientFilters ? (
          <div className="active-filter-row">
            <div className="active-filter-list">
              <span>Active filters:</span>
              {activeClientFilterLabels.map((label) => (
                <span className="filter-chip" key={label}>
                  {label}
                </span>
              ))}
            </div>
            <button className="text-button" type="button" onClick={clearClientFilters}>
              Clear all
            </button>
          </div>
        ) : null}
      </section>

      <div className="clients-layout">
        <ClientListPanel
          filteredClientSummary={filteredClientSummary}
          clientSort={clientSort}
          setClientSort={setClientSort}
          isClientSortMenuOpen={isClientSortMenuOpen}
          setIsClientSortMenuOpen={setIsClientSortMenuOpen}
          clientSortMenuRef={clientSortMenuRef}
          groupedClients={groupedClients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          setActiveClientTab={setActiveClientTab}
        />

        <div className="client-main">
          {selectedClient && clientQuickSummary ? (
            <div className="client-summary-card">
              <div className="client-summary-main">
                <div>
                  <span className="settings-clinic-kicker">Selected client</span>
                  <h3 className="client-summary-title">{clientQuickSummary.name}</h3>
                  <p className="client-summary-subtitle">
                    Quick record snapshot before editing.
                  </p>
                </div>

                <span className="client-summary-status">{clientQuickSummary.status}</span>
              </div>

              {isSelectedClientHiddenByFilters ? (
                <p className="client-summary-warning">
                  This client is currently hidden by the active filters. Clear filters to show
                  them in the list again.
                </p>
              ) : null}

              <div className="client-summary-grid">
                <div className="client-summary-item">
                  <span className="client-summary-label">Status</span>
                  <strong className="client-summary-value">{clientQuickSummary.status}</strong>
                </div>
                <div className="client-summary-item">
                  <span className="client-summary-label">Category</span>
                  <strong className="client-summary-value">{clientQuickSummary.category}</strong>
                </div>
                <div className="client-summary-item">
                  <span className="client-summary-label">Intake date</span>
                  <strong className="client-summary-value">{clientQuickSummary.intakeDate}</strong>
                </div>
                <div className="client-summary-item">
                  <span className="client-summary-label">C-SSRS</span>
                  <strong className="client-summary-value">{clientQuickSummary.cssrsStatus}</strong>
                </div>
                <div className="client-summary-item">
                  <span className="client-summary-label">Last note</span>
                  <strong className="client-summary-value">
                    {clientQuickSummary.lastProgressNoteDate}
                  </strong>
                </div>
                <div className="client-summary-item">
                  <span className="client-summary-label">Files</span>
                  <strong className="client-summary-value">{clientQuickSummary.fileSummary}</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="tab-row preview-tab-row">
            <button
              className={activeClientTab === "overview" ? "tab active" : "tab"}
              onClick={() => setActiveClientTab("overview")}
            >
              Overview
            </button>

            {hasSuicidalIdeation && (
              <button
                className={activeClientTab === "cssrs" ? "tab active" : "tab"}
                onClick={() => setActiveClientTab("cssrs")}
              >
                C-SSRS
              </button>
            )}

            <button
              className={activeClientTab === "fourPs" ? "tab active" : "tab"}
              onClick={() => setActiveClientTab("fourPs")}
            >
              4Ps
            </button>

            <button
              className={activeClientTab === "notes" ? "tab active" : "tab"}
              onClick={() => setActiveClientTab("notes")}
            >
              Progress Notes
            </button>

            <button
              className={activeClientTab === "documents" ? "tab active" : "tab"}
              onClick={() => setActiveClientTab("documents")}
            >
              Documents
            </button>

            <button
              className={
                activeClientTab === "assessments" ? "tab active" : "tab"
              }
              onClick={() => setActiveClientTab("assessments")}
            >
              Assessments
            </button>
          </div>

          {selectedClient ? (
            <ClientTabContent {...clientTabContentProps} />
          ) : (
            <div className="panel empty-panel">
              <h3>No client selected</h3>
              <p>Create a client or choose one from the list.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
