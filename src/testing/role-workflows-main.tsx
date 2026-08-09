import React, { useRef, useState } from "react";
import ReactDOM from "react-dom/client";

import "../App.css";
import {
  canCreateClientRecords,
  emptyDashboardAnnouncement,
  getCareTeamRoleCapabilities,
  type CareTeamInviteForm,
  type ClientTab,
  type Profile,
  type SortMode,
} from "../appShared";
import { CareTeamSection } from "../features/care-team/CareTeamSection";
import {
  ClientsSection,
  type GroupedClient,
} from "../features/clients/ClientsSection";
import type { ClientTabContentProps } from "../features/clients/ClientTabContent";
import { SettingsSection } from "../features/settings/SettingsSection";

const roleByQuery = {
  admin: "Admin",
  staff: "Staff",
  psychologist: "Psychologist / Counselor",
} as const;

type WorkflowRole = (typeof roleByQuery)[keyof typeof roleByQuery];

const roleKey = new URLSearchParams(window.location.search).get("role") ?? "admin";
const workflowRole: WorkflowRole =
  roleByQuery[roleKey as keyof typeof roleByQuery] ?? roleByQuery.admin;

const adminMember = {
  id: "admin-1",
  full_name: "Clinic Administrator",
  email: "admin@example.test",
  role: "Admin",
  hpc_representative_name: "Clinic Administrator",
  is_main_admin: true,
};

const psychologistMember = {
  id: "psychologist-1",
  full_name: "Staging Psych Test",
  email: "psychologist@example.test",
  role: "Psychologist / Counselor",
  hpc_representative_name: "Staging Psych Test",
};

const staffMember = {
  id: "staff-1",
  full_name: "Staging Staff Test",
  email: "staff@example.test",
  role: "Staff",
  hpc_representative_name: null,
};

const clientRecords: GroupedClient[] = [
  {
    id: "client-assigned",
    client_name: "Assigned Client",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    intake_date: "2026-08-01",
    client_status: "Active",
    status: "Active",
    category_path: "Testing",
    hpc_representative: "Staging Psych Test",
  },
  {
    id: "client-clinic",
    client_name: "Clinic Client",
    created_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    intake_date: "2026-08-02",
    client_status: "Active",
    category_path: "Testing",
    status: "Active",
    hpc_representative: "Clinic Administrator",
  },
];

function RoleWorkflowHarness({ role }: { role: WorkflowRole }) {
  const capabilities = getCareTeamRoleCapabilities(role);
  const profileId = role === "Admin" ? "admin-1" : role === "Staff" ? "staff-1" : "psychologist-1";
  const profile: Profile = {
    id: profileId,
    full_name: role === "Admin" ? "Clinic Administrator" : role === "Staff" ? "Staging Staff Test" : "Staging Psych Test",
    role,
    email: `${role.toLowerCase().replace(/[^a-z]+/g, "-")}@example.test`,
    hpc_representative_name:
      role === "Admin" ? "Clinic Administrator" : role === "Psychologist / Counselor" ? "Staging Psych Test" : null,
    is_active: true,
  };

  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "Active" | "Terminated">("all");
  const [clientCategoryFilter, setClientCategoryFilter] = useState("all");
  const [clientYearFilter, setClientYearFilter] = useState("all");
  const [clientMonthFilter, setClientMonthFilter] = useState("all");
  const [clientSort, setClientSort] = useState<SortMode>("alphabetical");
  const [isClientSortMenuOpen, setIsClientSortMenuOpen] = useState(false);
  const [activeClientTab, setActiveClientTab] = useState<ClientTab>("overview");
  const [clientActionStatus, setClientActionStatus] = useState("No client action yet");
  const clientSortMenuRef = useRef<HTMLDivElement>(null);

  const visibleClients =
    role === "Psychologist / Counselor" ? clientRecords.slice(0, 1) : clientRecords;

  const [careTeamInviteForm, setCareTeamInviteForm] = useState<CareTeamInviteForm>({
    full_name: "",
    email: "",
    role: "Staff",
    hpc_representative_name: "",
  });

  const clinicInfo = {
    id: 1,
    mobile_number: "0917 000 0000",
    landline_number: "02 8000 0000",
    email: "clinic@example.test",
    address: "Test clinic address",
  };
  const [clinicInfoDraft, setClinicInfoDraft] = useState(clinicInfo);
  const [dashboardAnnouncement, setDashboardAnnouncement] = useState(
    emptyDashboardAnnouncement()
  );
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "clinic" | "clinic-dark">("clinic");
  const [clientCategoryDraft, setClientCategoryDraft] = useState("");
  const [editingClientCategoryName, setEditingClientCategoryName] = useState("");
  const [restoreConfirmationText, setRestoreConfirmationText] = useState("");
  const backupRestoreInputRef = useRef<HTMLInputElement>(null);

  return (
    <main data-testid="role-workflow-harness">
      <header className="panel" style={{ margin: 20 }}>
        <strong data-testid="current-role">{role}</strong>
        <span data-testid="client-action-status">{clientActionStatus}</span>
      </header>

      <ClientsSection
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        handleAddClient={async (representativeName) => {
          setClientActionStatus(`Created for ${representativeName ?? "unassigned"}`);
          return true;
        }}
        canCreateClientRecords={canCreateClientRecords(role)}
        hpcRepresentativeOptions={["Clinic Administrator", "Staging Psych Test"]}
        requiresNewClientRepresentativeSelection={role === "Staff"}
        defaultNewClientRepresentative={
          role === "Psychologist / Counselor" ? "Staging Psych Test" : "Clinic Administrator"
        }
        loading={false}
        clientStatusFilter={clientStatusFilter}
        setClientStatusFilter={setClientStatusFilter}
        clientCategoryFilter={clientCategoryFilter}
        setClientCategoryFilter={setClientCategoryFilter}
        availableClientCategories={["Testing"]}
        clientYearFilter={clientYearFilter}
        setClientYearFilter={setClientYearFilter}
        availableClientYears={["2026"]}
        clientMonthFilter={clientMonthFilter}
        setClientMonthFilter={setClientMonthFilter}
        availableClientMonths={["August"]}
        filteredClientSummary={{ total: visibleClients.length, active: visibleClients.length, terminated: 0 }}
        hasActiveClientFilters={false}
        activeClientFilterLabels={[]}
        clearClientFilters={() => undefined}
        clientSort={clientSort}
        setClientSort={setClientSort}
        isClientSortMenuOpen={isClientSortMenuOpen}
        setIsClientSortMenuOpen={setIsClientSortMenuOpen}
        clientSortMenuRef={clientSortMenuRef}
        groupedClients={[{ label: "August 2026", clients: visibleClients }]}
        selectedClientId=""
        setSelectedClientId={() => undefined}
        setActiveClientTab={setActiveClientTab}
        activeClientTab={activeClientTab}
        hasSuicidalIdeation={false}
        selectedClient={null}
        isSelectedClientHiddenByFilters={false}
        clientQuickSummary={null}
        clientTabContentProps={{} as ClientTabContentProps}
      />

      <CareTeamSection
        careTeamMembers={[adminMember, psychologistMember, staffMember]}
        careTeamStatus=""
        profile={profile}
        canManageCareTeam={capabilities.canManageCareTeam}
        canManageAdminAccounts={capabilities.canManageAdminAccounts}
        careTeamSavingId=""
        careTeamSavingAction=""
        handleUpdateCareTeamRole={() => undefined}
        handleRemoveCareTeamMember={() => undefined}
        careTeamInviteForm={careTeamInviteForm}
        setCareTeamInviteForm={setCareTeamInviteForm}
        hpcRepresentativeOptions={["Clinic Administrator", "Staging Psych Test", "Other"]}
        isInvitingCareTeam={false}
        handleAddCareTeamMember={() => undefined}
      />

      <SettingsSection
        clinicInfo={clinicInfo}
        clinicInfoDraft={clinicInfoDraft}
        setClinicInfoDraft={setClinicInfoDraft}
        clinicInfoStatus=""
        canManageClinicInfo={role === "Admin" || role === "Staff"}
        isClinicInfoEditing={false}
        isClinicInfoSaving={false}
        handleStartClinicInfoEdit={() => undefined}
        handleCancelClinicInfoEdit={() => undefined}
        handleSaveClinicInfo={() => undefined}
        canManageDashboardAnnouncements={capabilities.canManageDashboardAnnouncements}
        dashboardAnnouncement={dashboardAnnouncement}
        setDashboardAnnouncement={setDashboardAnnouncement}
        dashboardAnnouncementStatus=""
        canManageLoading={false}
        handleSaveDashboardAnnouncement={() => undefined}
        handleClearDashboardAnnouncement={() => undefined}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        clientCategories={[{ id: "category-1", name: "Testing" }]}
        clientCategoryDraft={clientCategoryDraft}
        setClientCategoryDraft={setClientCategoryDraft}
        clientCategoryStatus=""
        editingClientCategoryId=""
        editingClientCategoryName={editingClientCategoryName}
        setEditingClientCategoryName={setEditingClientCategoryName}
        handleAddClientCategory={() => undefined}
        handleStartEditClientCategory={() => undefined}
        handleCancelEditClientCategory={() => undefined}
        handleUpdateClientCategory={() => undefined}
        handleDeleteClientCategory={() => undefined}
        canManageClientCategoriesAndBackups={capabilities.canManageClientCategoriesAndBackups}
        canViewAuditLogs={capabilities.canViewAuditLogs}
        canRestoreClinicBackup={role === "Admin"}
        isExportingBackup={false}
        isRestoringBackup={false}
        backupToolsStatus=""
        restorePreview={{
          file_name: "workflow-test.json",
          exported_at: "2026-08-10T00:00:00.000Z",
          product_name: "HPC Client Management",
          format_version: 2,
          source_project_ref: "workflow-test",
          table_counts: [{ key: "clients", label: "Clients", count: visibleClients.length }],
        }}
        isRestoreConfirmationOpen={false}
        restoreConfirmationText={restoreConfirmationText}
        setRestoreConfirmationText={setRestoreConfirmationText}
        backupRestoreInputRef={backupRestoreInputRef}
        handleExportClinicBackup={() => undefined}
        handleChooseRestorePackage={() => undefined}
        handleRestorePackageSelected={() => undefined}
        handleOpenRestoreConfirmation={() => undefined}
        handleCloseRestoreConfirmation={() => undefined}
        handleConfirmRestore={() => undefined}
        auditLogFilter="today"
        setAuditLogFilter={() => undefined}
        isAuditLogLoading={false}
        auditLogEntries={[]}
        auditLogStatus=""
        handleRefreshAuditLogs={() => undefined}
      />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RoleWorkflowHarness role={workflowRole} />
  </React.StrictMode>
);
