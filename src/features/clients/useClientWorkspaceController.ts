import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  AnalyticsCssrsInsight,
  ClientStatus,
  ClientTab,
  IntakeMonthRange,
  IntakeTimelineGrouping,
  IntakeYearRange,
  Section,
  SortMode,
  WriteAuditLog,
} from "../../appShared";
import {
  normalizeClientMetadata,
} from "../../appShared";
import { useAnalyticsViewModel } from "../analytics/useAnalyticsViewModel";
import { usePhoneUploadSession } from "../mobile-upload/usePhoneUploadSession";
import type { ClientsSectionProps } from "./ClientsSection";
import { useClientCategoryController } from "./useClientCategoryController";
import { serializeClientOverviewState } from "./clientOverviewHelpers";
import { useClient4PsManagement } from "./useClient4PsManagement";
import { useClientDetailsLoader } from "./useClientDetailsLoader";
import { useClientFileWorkflow } from "./useClientFileWorkflow";
import { useClientFilesLoader } from "./useClientFilesLoader";
import { useClientFilters } from "./useClientFilters";
import { useClientForm } from "./useClientForm";
import { useClientNavigationGuards } from "./useClientNavigationGuards";
import { useClientQuickSummary } from "./useClientQuickSummary";
import { useClientSave } from "./useClientSave";
import { useClientsLoader } from "./useClientsLoader";
import { useFilePreview } from "./useFilePreview";
import { useProgressNotesManagement } from "./useProgressNotesManagement";
import { useSelectedClientDataLoader } from "./useSelectedClientDataLoader";
import { useSelectedClientViews } from "./useSelectedClientViews";


type ClientAccessRecord = {
  hpc_representative?: string | null;
};

type GetClientsPropsOptions = {
  loading: boolean;
  hpcRepresentativeOptions: string[];
};

type UseClientWorkspaceControllerParams = {
  activeSection: Section;
  userEmail: string | null;
  profileDisplayRole: string;
  canManageCareTeam: boolean;
  canCreateClientRecords: boolean;
  canEditClientClinicalRecords: boolean;
  shouldLockClientRepresentativeToAssigned: boolean;
  canManageClientDocuments: boolean;
  canManageClientAssessments: boolean;
  canDeleteClientDocuments: boolean;
  canDeleteClientAssessments: boolean;
  canEditClientCssrsInterview: boolean;
  canEditClientCssrsProtectiveFactors: boolean;
  canCurrentProfileAccessClient: (client: ClientAccessRecord) => boolean;
  canCurrentProfileUseClientInPrimaryAnalytics: (client: ClientAccessRecord) => boolean;
  shouldUseAllRepresentativeAnalyticsDataset: boolean;
  shouldDefaultAnalyticsRepresentativeToAssigned: boolean;
  assignedHpcRepresentativeName: string;
  canUseAllRepresentativeAnalyticsForProfile: boolean;
  canUseIndividualRepresentativeAnalyticsForProfile: boolean;
  intakeTimelineGrouping: IntakeTimelineGrouping;
  setIntakeTimelineGrouping: Dispatch<SetStateAction<IntakeTimelineGrouping>>;
  intakeMonthRange: IntakeMonthRange;
  setIntakeMonthRange: Dispatch<SetStateAction<IntakeMonthRange>>;
  intakeYearRange: IntakeYearRange;
  setIntakeYearRange: Dispatch<SetStateAction<IntakeYearRange>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  writeAuditLog: WriteAuditLog;
};

export function useClientWorkspaceController({
  activeSection,
  userEmail,
  profileDisplayRole,
  canManageCareTeam,
  canCreateClientRecords,
  canEditClientClinicalRecords,
  shouldLockClientRepresentativeToAssigned,
  canManageClientDocuments,
  canManageClientAssessments,
  canDeleteClientDocuments,
  canDeleteClientAssessments,
  canEditClientCssrsInterview,
  canEditClientCssrsProtectiveFactors,
  canCurrentProfileAccessClient,
  canCurrentProfileUseClientInPrimaryAnalytics,
  shouldUseAllRepresentativeAnalyticsDataset,
  shouldDefaultAnalyticsRepresentativeToAssigned,
  assignedHpcRepresentativeName,
  canUseAllRepresentativeAnalyticsForProfile,
  canUseIndividualRepresentativeAnalyticsForProfile,
  intakeTimelineGrouping,
  setIntakeTimelineGrouping,
  intakeMonthRange,
  setIntakeMonthRange,
  intakeYearRange,
  setIntakeYearRange,
  setLoading,
  writeAuditLog,
}: UseClientWorkspaceControllerParams) {
  const [activeClientTab, setActiveClientTab] = useState<ClientTab>("overview");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSort, setClientSort] = useState<SortMode>("alphabetical");
  const [isClientSortMenuOpen, setIsClientSortMenuOpen] = useState(false);
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | ClientStatus>("all");
  const [clientCategoryFilter, setClientCategoryFilter] = useState("all");
  const [clientYearFilter, setClientYearFilter] = useState("all");
  const [clientMonthFilter, setClientMonthFilter] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState("");

  const clientSortMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    clientForm,
    setClientForm,
    childrenForms,
    setChildrenForms,
    resetClientForm,
    updateClientForm,
    updateSiblingOrderPart,
    toggleCounsellingReason,
    addChildRow,
    updateChildRow,
    removeChildRow,
  } = useClientForm();
  const [clientMessage, setClientMessage] = useState("");
  const [clientOverviewBaselineSnapshot, setClientOverviewBaselineSnapshot] = useState("");
  const { clients, setClients, loadClients } = useClientsLoader({
    setClientMessage,
  });

  const clientRows = useMemo(
    () =>
      clients
        .filter(canCurrentProfileAccessClient)
        .map((client) => ({
          ...client,
          ...normalizeClientMetadata(client),
        })),
    [canCurrentProfileAccessClient, clients]
  );

  const {
    clientCategories,
    clientCategoryOptions,
    clientCategoryDraft,
    setClientCategoryDraft,
    clientCategoryStatus,
    editingClientCategoryId,
    editingClientCategoryName,
    setEditingClientCategoryName,
    loadClientCategories,
    resetClientCategoryState,
    handleAddClientCategory,
    handleStartEditClientCategory,
    handleCancelEditClientCategory,
    handleUpdateClientCategory,
    handleDeleteClientCategory,
    clientCategorySettingsProps,
  } = useClientCategoryController({
    canManageClientCategories: canManageCareTeam,
    clientRows,
    writeAuditLog,
  });

  useEffect(() => {
    if (activeSection === "clients" || activeSection === "settings") {
      void loadClientCategories();
    }
  }, [activeSection, loadClientCategories]);

  const {
    client4PsForm,
    client4PsNarrativeReport,
    client4PsMessage,
    isSavingClient4Ps,
    isGeneratingClient4PsNarrative,
    loadClient4Ps,
    clearClient4Ps,
    updateClient4PsField,
    updateClient4PsNarrativeReport,
    generateClient4PsNarrative,
    saveClient4Ps,
  } = useClient4PsManagement({
    selectedClientId,
    canEditClientClinicalRecords,
    writeAuditLog,
  });

  const {
    noteForm,
    notesMessage,
    updateNoteForm,
    handleEditNote,
    handleCancelEditNote,
    progressNotes,
    loadProgressNotes,
    clearProgressNotes,
    handleSaveNote,
  } = useProgressNotesManagement({
    selectedClientId,
    selectedClientName: clients.find((client) => client.id === selectedClientId)?.client_name ?? null,
    setLoading,
    writeAuditLog,
  });

  const {
    documents,
    documentsMessage,
    setDocumentsMessage,
    loadDocuments,
    assessments,
    assessmentsMessage,
    setAssessmentsMessage,
    loadAssessments,
    clearClientFiles,
  } = useClientFilesLoader();

  const {
    documentSearch,
    setDocumentSearch,
    documentUploadDateFilter,
    setDocumentUploadDateFilter,
    selectedDocumentId,
    setSelectedDocumentId,
    filteredDocuments,
    assessmentSearch,
    setAssessmentSearch,
    assessmentUploadDateFilter,
    setAssessmentUploadDateFilter,
    selectedAssessmentId,
    setSelectedAssessmentId,
    filteredAssessments,
  } = useFilePreview({
    documents,
    assessments,
  });

  const {
    availableClientCategories,
    availableClientYears,
    availableClientMonths,
    filteredClients,
    groupedClients,
    filteredClientSummary,
  } = useClientFilters({
    clientRows,
    categoryOptions: clientCategoryOptions,
    clientSearch,
    clientSort,
    clientStatusFilter,
    clientCategoryFilter,
    clientYearFilter,
    clientMonthFilter,
  });

  const hasActiveClientFilters =
    clientSearch.trim() !== "" ||
    clientStatusFilter !== "all" ||
    clientCategoryFilter !== "all" ||
    clientYearFilter !== "all" ||
    clientMonthFilter !== "all";

  const activeClientFilterLabels = [
    clientSearch.trim() ? `Search: ${clientSearch.trim()}` : "",
    clientStatusFilter !== "all" ? `Status: ${clientStatusFilter}` : "",
    clientCategoryFilter !== "all" ? `Category: ${clientCategoryFilter}` : "",
    clientYearFilter !== "all" ? `Year: ${clientYearFilter}` : "",
    clientMonthFilter !== "all" ? `Month: ${clientMonthFilter}` : "",
  ].filter(Boolean);

  const clearClientFilters = () => {
    setClientSearch("");
    setClientStatusFilter("all");
    setClientCategoryFilter("all");
    setClientYearFilter("all");
    setClientMonthFilter("all");
  };

  const {
    analyticsClients,
    analyticsDashboardInputs,
    analyticsViewModel,
    loadAnalyticsData,
  } = useAnalyticsViewModel({
    activeSection,
    userEmail,
    clientsLength: clients.length,
    progressNotesLength: progressNotes.length,
    documentsLength: documents.length,
    assessmentsLength: assessments.length,
    canCurrentProfileUseClientInPrimaryAnalytics,
    shouldUseAllRepresentativeAnalyticsDataset,
    shouldDefaultAnalyticsRepresentativeToAssigned,
    assignedHpcRepresentativeName,
    canUseAllRepresentativeAnalyticsForProfile,
    canUseIndividualRepresentativeAnalyticsForProfile,
    clientCategoryOptions,
    intakeTimelineGrouping,
    setIntakeTimelineGrouping,
    intakeMonthRange,
    setIntakeMonthRange,
    intakeYearRange,
    setIntakeYearRange,
  });

  const {
    isPhoneUploadModalOpen,
    phoneUploadTarget,
    phoneUploadSession,
    isCreatingPhoneUploadSession,
    phoneUploadStatusMessage,
    phoneUploadQrCodeUrl,
    phoneUploadCopied,
    phoneUploadNow,
    handleClosePhoneUpload,
    handleOpenPhoneUpload: openPhoneUploadSession,
    handleRefreshPhoneUpload,
    handleCopyPhoneUploadLink,
  } = usePhoneUploadSession({
    selectedClientId,
    loadDocuments,
    loadAssessments,
    setSelectedDocumentId,
    setSelectedAssessmentId,
    setDocumentsMessage,
    setAssessmentsMessage,
  });

  const currentClientOverviewSnapshot = useMemo(
    () => serializeClientOverviewState(clientForm, childrenForms),
    [clientForm, childrenForms]
  );
  const isClientOverviewDirty =
    Boolean(selectedClientId) &&
    clientOverviewBaselineSnapshot !== "" &&
    clientOverviewBaselineSnapshot !== currentClientOverviewSnapshot;

  useEffect(() => {
    if (!shouldLockClientRepresentativeToAssigned || !assignedHpcRepresentativeName) {
      return;
    }

    if (clientForm.hpc_representative === assignedHpcRepresentativeName) {
      return;
    }

    updateClientForm("hpc_representative", assignedHpcRepresentativeName);
    updateClientForm("hpc_representative_other", "");
  }, [
    assignedHpcRepresentativeName,
    clientForm.hpc_representative,
    shouldLockClientRepresentativeToAssigned,
    updateClientForm,
  ]);

  const loadClientDetails = useClientDetailsLoader({
    clients,
    setClientForm,
    setChildrenForms,
    setClientOverviewBaselineSnapshot,
    setClientMessage,
  });

  useEffect(() => {
    if (clientRows.length === 0) {
      setSelectedClientId("");
      return;
    }

    if (!selectedClientId) {
      const nextClientId = filteredClients[0]?.id ?? clientRows[0]?.id ?? "";
      setSelectedClientId(nextClientId);
      setActiveClientTab("overview");
      return;
    }

    if (!clientRows.some((client) => client.id === selectedClientId)) {
      const nextClientId = filteredClients[0]?.id ?? clientRows[0]?.id ?? "";
      setSelectedClientId(nextClientId);
      setActiveClientTab("overview");
    }
  }, [clientRows, filteredClients, selectedClientId]);

  const {
    selectedClient,
    selectedDocument,
    selectedAssessment,
    hasSuicidalIdeation,
  } = useSelectedClientViews({
    filteredClients,
    selectedClientId,
    filteredDocuments,
    selectedDocumentId,
    filteredAssessments,
    selectedAssessmentId,
    clientForm,
    clientRows,
  });

  const {
    documentInputRef,
    assessmentInputRef,
    documentPreviewUrl,
    setDocumentPreviewUrl,
    documentPreviewLoading,
    setDocumentPreviewLoading,
    assessmentPreviewUrl,
    setAssessmentPreviewUrl,
    assessmentPreviewLoading,
    setAssessmentPreviewLoading,
    fileRenameTarget,
    fileRenameInput,
    setFileRenameInput,
    fileDeleteTarget,
    handleOpenDocumentPicker,
    handleOpenAssessmentPicker,
    handleOpenPhoneUpload,
    handleUploadDocument,
    handleUploadAssessment,
    handleOpenDocumentDelete,
    handleOpenAssessmentDelete,
    handleOpenDocumentRename,
    handleOpenAssessmentRename,
    handleDownloadDocument,
    handleDownloadAssessment,
    handleCloseFileDeleteModal,
    handleConfirmFileDelete,
    handleCloseFileRenameModal,
    handleConfirmFileRename,
  } = useClientFileWorkflow({
    selectedClientId,
    selectedClient,
    selectedDocument,
    selectedDocumentId,
    setSelectedDocumentId,
    selectedAssessment,
    selectedAssessmentId,
    setSelectedAssessmentId,
    canManageClientDocuments,
    canManageClientAssessments,
    canDeleteClientDocuments,
    canDeleteClientAssessments,
    setLoading,
    setDocumentsMessage,
    setAssessmentsMessage,
    loadDocuments,
    loadAssessments,
    openPhoneUploadSession,
    writeAuditLog,
  });

  useEffect(() => {
    if (filteredDocuments.length === 0) {
      setSelectedDocumentId("");
      setDocumentPreviewUrl("");
      return;
    }

    if (!filteredDocuments.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(filteredDocuments[0].id);
    }
  }, [filteredDocuments, selectedDocumentId, setSelectedDocumentId, setDocumentPreviewUrl]);

  useEffect(() => {
    if (filteredAssessments.length === 0) {
      setSelectedAssessmentId("");
      setAssessmentPreviewUrl("");
      return;
    }

    if (!filteredAssessments.some((assessment) => assessment.id === selectedAssessmentId)) {
      setSelectedAssessmentId(filteredAssessments[0].id);
    }
  }, [filteredAssessments, selectedAssessmentId, setSelectedAssessmentId, setAssessmentPreviewUrl]);

  useSelectedClientDataLoader({
    selectedClientId,
    clients,
    analyticsClients,
    canCurrentProfileAccessClient,
    resetClientForm,
    clearClient4Ps,
    setClientOverviewBaselineSnapshot,
    clearProgressNotes,
    clearClientFiles,
    setSelectedDocumentId,
    setDocumentPreviewUrl,
    setDocumentPreviewLoading,
    setSelectedAssessmentId,
    setAssessmentPreviewUrl,
    setAssessmentPreviewLoading,
    loadClientDetails,
    loadClient4Ps,
    loadProgressNotes,
    loadDocuments,
    loadAssessments,
    setClientMessage,
  });

  const {
    handleSelectedClientChange,
    handleActiveClientTabChange,
  } = useClientNavigationGuards({
    activeClientTab,
    selectedClientId,
    isClientOverviewDirty,
    hasSuicidalIdeation,
    setSelectedClientId,
    setActiveClientTab,
  });

  const getClient4PsAuditTargetLabel = useCallback(
    () => clientForm.client_name || selectedClient?.client_name || "Client",
    [clientForm.client_name, selectedClient?.client_name]
  );

  const handleGenerateClient4PsNarrative = useCallback(
    () => generateClient4PsNarrative(getClient4PsAuditTargetLabel()),
    [generateClient4PsNarrative, getClient4PsAuditTargetLabel]
  );

  const handleSaveClient4Ps = useCallback(
    () => saveClient4Ps(getClient4PsAuditTargetLabel()),
    [getClient4PsAuditTargetLabel, saveClient4Ps]
  );

  const isSelectedClientHiddenByFilters =
    Boolean(selectedClientId) &&
    !filteredClients.some((client) => client.id === selectedClientId);

  const clientQuickSummary = useClientQuickSummary({
    selectedClient,
    clientForm,
    cssrsByClientId: analyticsDashboardInputs.analyticsCssrsByClientId as Map<string, AnalyticsCssrsInsight>,
    hasSuicidalIdeation,
    progressNotes,
    documents,
    assessments,
  });

  const {
    handleAddClient,
    handleSaveClientOverview,
  } = useClientSave({
    selectedClientId,
    clientForm,
    childrenForms,
    canCreateClientRecords,
    shouldLockClientRepresentativeToAssigned,
    assignedHpcRepresentativeName,
    setLoading,
    setClientMessage,
    loadClients,
    loadClientDetails,
    setSelectedClientId,
    setActiveClientTab,
    writeAuditLog,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!clientSortMenuRef.current?.contains(target)) {
        setIsClientSortMenuOpen(false);
      }
    };

    if (isClientSortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isClientSortMenuOpen]);

  const getClientsProps = ({
    loading,
    hpcRepresentativeOptions,
  }: GetClientsPropsOptions): ClientsSectionProps => ({
    clientSearch,
    setClientSearch,
    handleAddClient,
    canCreateClientRecords,
    hpcRepresentativeOptions,
    requiresNewClientRepresentativeSelection: profileDisplayRole === "Staff",
    defaultNewClientRepresentative:
      profileDisplayRole === "Admin"
        ? "Clinic Administrator"
        : assignedHpcRepresentativeName,
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
    setSelectedClientId: handleSelectedClientChange,
    setActiveClientTab: handleActiveClientTabChange,
    activeClientTab,
    hasSuicidalIdeation,
    selectedClient,
    isSelectedClientHiddenByFilters,
    clientQuickSummary,
    clientTabContentProps: {
      activeClientTab,
      hasSuicidalIdeation,
      cssrsClientName: clientForm.client_name || selectedClient?.client_name || null,
      fourPsIsReadOnly: !canEditClientClinicalRecords,
      cssrsIsReadOnly: !canEditClientCssrsInterview,
      canEditCssrsProtectiveFactors: canEditClientCssrsProtectiveFactors,
      clientForm,
      categoryOptions: clientCategoryOptions,
      hpcRepresentativeOptions,
      isHpcRepresentativeLocked: shouldLockClientRepresentativeToAssigned,
      lockedHpcRepresentativeName: assignedHpcRepresentativeName,
      childrenForms,
      clientMessage,
      loading,
      selectedClientId,
      isClientOverviewDirty,
      updateClientForm,
      updateSiblingOrderPart,
      toggleCounsellingReason,
      addChildRow,
      updateChildRow,
      removeChildRow,
      handleSaveClientOverview,
      client4PsForm,
      client4PsNarrativeReport,
      client4PsMessage,
      isSavingClient4Ps,
      isGeneratingClient4PsNarrative,
      updateClient4PsField,
      updateClient4PsNarrativeReport,
      handleGenerateClient4PsNarrative,
      handleSaveClient4Ps,
      writeAuditLog,
      onCssrsSaved: loadAnalyticsData,
      notesMessage,
      progressNotes,
      noteForm,
      updateNoteForm,
      handleEditNote,
      handleCancelEditNote,
      handleSaveNote,
      canEditProgressNotes: canEditClientClinicalRecords,
      isCreatingPhoneUploadSession,
      documentSearch,
      setDocumentSearch,
      documentUploadDateFilter,
      setDocumentUploadDateFilter,
      handleOpenDocumentPicker,
      handleOpenPhoneUpload,
      selectedDocument,
      handleDeleteDocument: handleOpenDocumentDelete,
      handleRenameDocument: handleOpenDocumentRename,
      handleDownloadDocument,
      documentInputRef,
      handleUploadDocument,
      documentsMessage,
      filteredDocuments,
      selectedDocumentId,
      setSelectedDocumentId,
      documentPreviewLoading,
      documentPreviewUrl,
      canManageDocuments: canManageClientDocuments,
      canDeleteDocuments: canDeleteClientDocuments,
      assessmentSearch,
      setAssessmentSearch,
      assessmentUploadDateFilter,
      setAssessmentUploadDateFilter,
      handleOpenAssessmentPicker,
      handleOpenPhoneUploadAssessment: () => void handleOpenPhoneUpload("assessment"),
      selectedAssessment,
      handleDeleteAssessment: handleOpenAssessmentDelete,
      handleRenameAssessment: handleOpenAssessmentRename,
      handleDownloadAssessment,
      assessmentInputRef,
      handleUploadAssessment,
      assessmentsMessage,
      filteredAssessments,
      selectedAssessmentId,
      setSelectedAssessmentId,
      assessmentPreviewLoading,
      assessmentPreviewUrl,
      canManageAssessments: canManageClientAssessments,
      canDeleteAssessments: canDeleteClientAssessments,
    },
  });

  return {
    getClientsProps,
    activeClientTab,
    setActiveClientTab,
    clientSearch,
    setClientSearch,
    clientSort,
    setClientSort,
    isClientSortMenuOpen,
    setIsClientSortMenuOpen,
    clientStatusFilter,
    setClientStatusFilter,
    clientCategoryFilter,
    setClientCategoryFilter,
    clientYearFilter,
    setClientYearFilter,
    clientMonthFilter,
    setClientMonthFilter,
    selectedClientId,
    setSelectedClientId,

    clientForm,
    childrenForms,
    resetClientForm,
    updateClientForm,
    updateSiblingOrderPart,
    toggleCounsellingReason,
    addChildRow,
    updateChildRow,
    removeChildRow,
    clientMessage,
    setClientMessage,
    clients,
    setClients,
    loadClients,
    clientRows,

    clientCategories,
    clientCategoryOptions,
    clientCategoryDraft,
    setClientCategoryDraft,
    clientCategoryStatus,
    editingClientCategoryId,
    editingClientCategoryName,
    setEditingClientCategoryName,
    loadClientCategories,
    resetClientCategoryState,
    handleAddClientCategory,
    handleStartEditClientCategory,
    handleCancelEditClientCategory,
    handleUpdateClientCategory,
    handleDeleteClientCategory,
    clientCategorySettingsProps,

    client4PsForm,
    client4PsNarrativeReport,
    client4PsMessage,
    isSavingClient4Ps,
    isGeneratingClient4PsNarrative,
    clearClient4Ps,
    updateClient4PsField,
    updateClient4PsNarrativeReport,
    handleGenerateClient4PsNarrative,
    handleSaveClient4Ps,

    noteForm,
    notesMessage,
    updateNoteForm,
    handleEditNote,
    handleCancelEditNote,
    progressNotes,
    clearProgressNotes,
    handleSaveNote,

    documents,
    documentsMessage,
    setDocumentsMessage,
    loadDocuments,
    assessments,
    assessmentsMessage,
    setAssessmentsMessage,
    loadAssessments,
    clearClientFiles,

    documentSearch,
    setDocumentSearch,
    documentUploadDateFilter,
    setDocumentUploadDateFilter,
    selectedDocumentId,
    setSelectedDocumentId,
    filteredDocuments,
    assessmentSearch,
    setAssessmentSearch,
    assessmentUploadDateFilter,
    setAssessmentUploadDateFilter,
    selectedAssessmentId,
    setSelectedAssessmentId,
    filteredAssessments,

    availableClientCategories,
    availableClientYears,
    availableClientMonths,
    filteredClients,
    groupedClients,
    filteredClientSummary,
    hasActiveClientFilters,
    activeClientFilterLabels,
    clearClientFilters,

    analyticsClients,
    analyticsDashboardInputs,
    analyticsViewModel,
    loadAnalyticsData,

    isPhoneUploadModalOpen,
    phoneUploadTarget,
    phoneUploadSession,
    isCreatingPhoneUploadSession,
    phoneUploadStatusMessage,
    phoneUploadQrCodeUrl,
    phoneUploadCopied,
    phoneUploadNow,
    handleClosePhoneUpload,
    handleRefreshPhoneUpload,
    handleCopyPhoneUploadLink,

    isClientOverviewDirty,
    loadClientDetails,
    selectedClient,
    selectedDocument,
    selectedAssessment,
    hasSuicidalIdeation,

    documentInputRef,
    assessmentInputRef,
    documentPreviewUrl,
    setDocumentPreviewUrl,
    documentPreviewLoading,
    setDocumentPreviewLoading,
    assessmentPreviewUrl,
    setAssessmentPreviewUrl,
    assessmentPreviewLoading,
    setAssessmentPreviewLoading,
    fileRenameTarget,
    fileRenameInput,
    setFileRenameInput,
    fileDeleteTarget,
    handleOpenDocumentPicker,
    handleOpenAssessmentPicker,
    handleOpenPhoneUpload,
    handleUploadDocument,
    handleUploadAssessment,
    handleOpenDocumentDelete,
    handleOpenAssessmentDelete,
    handleOpenDocumentRename,
    handleOpenAssessmentRename,
    handleDownloadDocument,
    handleDownloadAssessment,
    handleCloseFileDeleteModal,
    handleConfirmFileDelete,
    handleCloseFileRenameModal,
    handleConfirmFileRename,

    handleSelectedClientChange,
    handleActiveClientTabChange,
    isSelectedClientHiddenByFilters,
    clientQuickSummary,
    handleAddClient,
    handleSaveClientOverview,
    clientSortMenuRef,
  };
}

export type ClientWorkspaceController = ReturnType<typeof useClientWorkspaceController>;
